import * as cheerio from 'cheerio';
import * as crypto from "crypto";

export interface BoardQuestionContent {
  source: "peerprep" | "mksap";
  questionId?: string;
  category?: string;
  capturedAt: string;
  sourceUrl: string;
  vignetteHtml: string;
  questionStemHtml: string;
  answers: AnswerOption[];
  wasCorrect: boolean;
  explanationHtml: string;
  keyPointsHtml?: string;
  referencesHtml?: string;
  peerPearlsHtml?: string;
  images: QuestionImage[];
  attempts: AttemptRecord[];
}

export interface AnswerOption {
  letter: string;
  html: string;
  isCorrect: boolean;
  isUserChoice: boolean;
  peerPercent?: number;
}

export interface QuestionImage {
  url: string;
  localPath: string;
  caption?: string;
  location:
    | "vignette"
    | "question"
    | "explanation"
    | "keypoint"
    | "references"
    | "peerpearls";
}

export interface AttemptRecord {
  attemptNumber: number;
  date: string;
  chosenAnswer: string;
  wasCorrect: boolean;
  note?: string;
}

/**
 * Generate a stable hash from question content to use as pseudo-questionId
 * when no explicit ID is available. Uses first 200 chars of cleaned vignette text.
 */
function generateQuestionHash(vignetteHtml: string): string {
  // Strip HTML tags and normalize whitespace
  const cleanText = vignetteHtml
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
  
  // Generate SHA256 hash and take first 12 chars for readability
  const hash = crypto.createHash('sha256')
    .update(cleanText)
    .digest('hex')
    .substring(0, 12);
  
  return `hash-${hash}`;
}

/**
 * Main dispatcher for parsing board questions from medical education sites.
 */
export function parseBoardQuestion(
  html: string,
  siteName: "ACEP PeerPrep" | "MKSAP 19",
  url: string,
  capturedAt: string
): BoardQuestionContent {
  const $ = cheerio.load(html);

  switch (siteName) {
    case "ACEP PeerPrep":
      return parsePeerPrep($, url, capturedAt);
    case "MKSAP 19":
      return parseMKSAP($, url, capturedAt);
    default:
      throw new Error(`Unsupported site: ${siteName}`);
  }
}

/**
 * Helper to extract HTML from a section based on potential header text or class names.
 * Enhanced to handle tab-based UIs common in PeerPrep and MKSAP.
 */
function getSectionHtml(
  $: cheerio.CheerioAPI,
  searchTitle: string,
  selectors: string[]
): string | undefined {
  // First try direct selectors
  for (const selector of selectors) {
    const html = $(selector).html();
    if (html && html.trim().length > 0) return html;
  }

  // Then try searching by header text (including tab buttons)
  let foundHtml: string | undefined = undefined;

  // Look for tab buttons, headings, or spans containing the search title
  $(":header, span, b, strong, a, button, [role='tab']").each(
    (_: number, el: cheerio.Element) => {
      const $el = $(el);
      const text = $el.text().trim().toLowerCase();
      if (text.includes(searchTitle.toLowerCase())) {
        // For tab-based UIs, check aria-controls or data-target attributes
        const ariaControls = $el.attr("aria-controls");
        const dataTarget = $el.attr("data-target") || $el.attr("href");

        if (ariaControls) {
          // Tab panel referenced by aria-controls
          const tabContent = $(`#${ariaControls}`).html();
          if (tabContent && tabContent.trim().length > 0) {
            foundHtml = tabContent;
            return false; // break loop
          }
        }

        if (dataTarget) {
          // Tab panel referenced by data-target or href
          const targetId = dataTarget.replace(/^#/, "");
          const tabContent = $(`#${targetId}`).html();
          if (tabContent && tabContent.trim().length > 0) {
            foundHtml = tabContent;
            return false; // break loop
          }
        }

        // Fallback: Look for associated tab panel in common structures
        // 1. Next sibling that's a tab-pane or tab-content
        let content = $el
          .next('.tab-pane, .tab-content, [role="tabpanel"]')
          .html();

        // 2. Parent's next sibling (common in nested tab structures)
        if (!content) {
          content = $el
            .parent()
            .next('.tab-pane, .tab-content, [role="tabpanel"]')
            .html();
        }

        // 3. Try index-based content lookup for tab structures
        if (!content) {
          const $tabList = $el.closest("ul, .nav, [role='tablist']");
          const $tabItem = $el.closest("li, [role='presentation']");
          if ($tabList.length && $tabItem.length) {
            const index = $tabList
              .find("li, [role='presentation']")
              .index($tabItem);
            const $tabContent = $tabList.next(
              ".tab-content, .content, [role='tabpanel']"
            ).length
              ? $tabList.next()
              : $tabList.parent().next(".tab-content, .content");

            if ($tabContent.length) {
              const $panes = $tabContent.find(".tab-pane, [role='tabpanel']");
              if ($panes.length > index && index >= 0) {
                content = $panes.eq(index).html();
              }
            }
          }
        }

        // 4. Any next sibling with substantial content (avoiding other tabs)
        if (!content) {
          const $next = $el.next();
          if ($next.length && !$next.is("li, a, button")) {
            content = $next.html();
          }
        }

        if (!content) {
          const $pNext = $el.parent().next();
          if ($pNext.length && !$pNext.is("li, a, button")) {
            content = $pNext.html();
          }
        }

        if (content && content.trim().length > 10) {
          // Require some actual length
          foundHtml = content;
          return false; // break loop
        }
      }
    }
  );

  return foundHtml;
}

/**
 * Deduplicates answers by both letter and content, keeping the one with most information.
 */
function deduplicateAnswers(answers: AnswerOption[]): AnswerOption[] {
  // 1. First, deduplicate by normalized content text to catch same answers with different letters
  const uniqueByContent = new Map<string, AnswerOption>();

  for (const answer of answers) {
    const text = answer.html
      .replace(/<[^>]*>/g, "")
      .trim()
      .toLowerCase();
    if (!text) continue;

    const existing = uniqueByContent.get(text);

    // Scoring info richness
    const getScore = (a: AnswerOption) => {
      let score = 0;
      if (a.isUserChoice) score += 100;
      if (a.isCorrect) score += 50;
      if (a.peerPercent !== undefined) score += 20;
      // Prefer letters A-F over high fallback letters G-Z
      if (/^[A-F]$/i.test(a.letter)) score += 10;
      if (a.html && a.html.length > 10) score += 1;
      return score;
    };

    if (!existing || getScore(answer) > getScore(existing)) {
      uniqueByContent.set(text, answer);
    }
  }

  // 2. Then, deduplicate by letter to catch same letters with different content (rare but possible)
  const uniqueByLetter = new Map<string, AnswerOption>();
  for (const answer of uniqueByContent.values()) {
    const existing = uniqueByLetter.get(answer.letter);
    const getScore = (a: AnswerOption) => {
      let score = 0;
      if (a.isUserChoice) score += 100;
      if (a.isCorrect) score += 50;
      if (a.peerPercent !== undefined) score += 20;
      if (a.html && a.html.length > 10) score += 1;
      return score;
    };

    if (!existing || getScore(answer) > getScore(existing)) {
      uniqueByLetter.set(answer.letter, answer);
    }
  }

  return Array.from(uniqueByLetter.values()).sort((a, b) =>
    a.letter.localeCompare(b.letter)
  );
}

/**
 * Stub for parsing ACEP PeerPrep questions.
 * Implementation planned for T124.6.
 */
function parsePeerPrep(
  $: cheerio.CheerioAPI,
  url: string,
  capturedAt: string
): BoardQuestionContent {
  // Extract questionId using multiple strategies
  let questionId: string | undefined = undefined;

  // Strategy 1: Try URL query parameters (e.g., ?questionId=123 or ?qid=123)
  // This is the ONLY reliable source for PeerPrep - URL params are unique per question
  try {
    const urlObj = new URL(url);
    questionId =
      urlObj.searchParams.get("questionId") ||
      urlObj.searchParams.get("qid") ||
      urlObj.searchParams.get("question") ||
      undefined;

    if (questionId) {
      questionId = `peerprep-${questionId}`;
    }
  } catch (e) {
    console.warn("[PeerPrep Parser] URL parsing failed:", e);
  }

  // Strategy 2: Look for data attributes or specific DOM elements with question IDs
  // Skip page title/body text searches - PeerPrep shows session counter ("Question #1")
  // which is NOT unique across different questions
  if (!questionId) {
    const dataId =
      $(".question-id, [data-question-id]").attr("data-question-id") ||
      $(".question-id").text().match(/\d+/)?.[0] ||
      $("[id^='question-']").attr("id")?.replace("question-", "");

    if (dataId) {
      questionId = `peerprep-${dataId}`;
    }
  }

  // Extract answers first so we can remove them from DOM
  const answers: AnswerOption[] = [];
  const answerSelectors = [".choices li", ".answerOption", ".answer-choice"];

  let options = $([]);
  for (const selector of answerSelectors) {
    options = $(selector);
    if (options.length > 0) break;
  }

  options.each((i: number, el: cheerio.Element) => {
    const $el = $(el);
    const letter =
      $el.find('.letter, [class*="letter"]').text().trim() ||
      String.fromCharCode(65 + i);

    // PeerPrep puts actual answer text inside a label tag
    const html =
      $el.find("label").html() ||
      $el.find(".answer-text, .content").html() ||
      $el.html() ||
      "";

    // Skip empty elements
    if (!html.trim()) return;

    const isCorrect =
      $el.hasClass("correct") ||
      $el.hasClass("correct-answer") ||
      // Precise check to avoid matching "incorrect"
      /\bcorrect\b/.test($el.attr("class") || "") ||
      false;
    const isUserChoice =
      $el.hasClass("active") ||
      $el.hasClass("selected") ||
      $el.hasClass("user-selected") ||
      /\b(active|selected|user-selected)\b/.test($el.attr("class") || "") ||
      false;

    // PeerPrep uses .peer-percent span
    const peerText = $el
      .find(".peer-percent span, .peer-response, .percentage")
      .text();
    const peerPercent =
      parseFloat(peerText.replace(/[^0-9.]/g, "")) || undefined;

    answers.push({ letter, html, isCorrect, isUserChoice, peerPercent });
  });

  const finalAnswers = deduplicateAnswers(answers);
  const wasCorrect = finalAnswers.some((a) => a.isUserChoice && a.isCorrect);

  // Clean answers from DOM to prevent duplication in vignette
  // We remove the specific options and common containers that might hold them
  $(".choices, .answerList, .answer-choice, .answerOption").remove();

  // Extract vignette and stem from cleaned DOM
  const vignetteEl = $(".questionStem, .question-stem").first();
  const vignetteHtml = vignetteEl.html() || "";
  const lastP = vignetteEl.find("p").last();
  const questionStemHtml = lastP.html() || vignetteHtml;

  let cleanedVignetteHtml = vignetteHtml;
  if (vignetteHtml.trim().endsWith(questionStemHtml.trim())) {
    lastP.remove();
    cleanedVignetteHtml = vignetteEl.html() || vignetteHtml;
  }

  // Strategy 3: Final fallback - generate hash from vignette content
  // This ensures every unique question gets a unique ID
  if (!questionId) {
    questionId = generateQuestionHash(cleanedVignetteHtml);
    console.log(
      "[PeerPrep Parser] No explicit questionId found, using content hash:",
      questionId
    );
  } else {
    console.log("[PeerPrep Parser] Using questionId:", questionId);
  }

  // PeerPrep uses "Reasoning" tab, MKSAP may use "Explanation"
  // Some sites use "Rationale", "Discussion", or "Commentary"
  //
  // IMPORTANT: PeerPrep structure has .feedbackTab (short intro) AND .distractorFeedbacks
  // (detailed explanations for each answer) as siblings inside the first .tab-pane.
  // We need to get the ENTIRE first tab-pane content, not just .feedbackTab.
  let explanationHtml = "";

  // PeerPrep-specific: Look for the tab-pane containing .feedbackTab (the Reasoning tab)
  // This gets the entire tab content including distractorFeedbacks
  const reasoningTabPane = $(".tab-pane").filter(function (
    this: cheerio.Element
  ) {
    return $(this).find(".feedbackTab").length > 0;
  });
  if (reasoningTabPane.length > 0) {
    explanationHtml = reasoningTabPane.first().html() || "";
  }

  // Fallback to getSectionHtml for other site structures
  if (!explanationHtml) {
    explanationHtml =
      getSectionHtml($, "Reasoning", [
        ".feedbackTab",
        ".feedback-content",
        "#feedbackTab",
        "#reasoning",
        ".tab-pane.reasoning",
      ]) ||
      getSectionHtml($, "Explanation", [
        ".feedbackTab",
        ".feedback-content",
        "#feedbackTab",
        "#explanation",
        ".tab-pane.explanation",
      ]) ||
      getSectionHtml($, "Rationale", [
        ".rationale",
        "#rationale",
        ".tab-pane.rationale",
      ]) ||
      getSectionHtml($, "Discussion", [
        ".discussion",
        "#discussion",
        ".tab-pane.discussion",
      ]) ||
      getSectionHtml($, "Commentary", [
        ".commentary",
        "#commentary",
        ".tab-pane.commentary",
      ]) ||
      getSectionHtml($, "Analysis", [
        ".analysis",
        "#analysis",
        ".tab-pane.analysis",
      ]) ||
      "";
  }
  // PeerPrep may use "Related Text / Key Point" or variations
  // The keyPointsTab is inside a tab-pane, get entire pane content
  let keyPointsHtml: string | undefined;
  const keyPointsTabPane = $(".tab-pane").filter(function (
    this: cheerio.Element
  ) {
    return $(this).find(".keyPointsTab").length > 0;
  });
  if (keyPointsTabPane.length > 0) {
    keyPointsHtml = keyPointsTabPane.first().html() || undefined;
  }
  if (!keyPointsHtml) {
    keyPointsHtml =
      getSectionHtml($, "Related Text", [
        ".keyPointsTab",
        ".key-points",
        "#keyPointsTab",
        "#related-text",
        ".tab-pane.key-point",
      ]) ||
      getSectionHtml($, "Key Point", [
        ".keyPointsTab",
        ".key-points",
        "#keyPointsTab",
      ]) ||
      getSectionHtml($, "Bottom Line", [
        ".bottom-line",
        "#bottom-line",
        ".tab-pane.bottom-line",
      ]);
  }

  // References tab - PeerPrep uses .referenceTab (singular, not plural)
  let referencesHtml: string | undefined;
  const referencesTabPane = $(".tab-pane").filter(function (
    this: cheerio.Element
  ) {
    // Find tab-pane with .referenceTab that does NOT contain PEER Pearl content (images)
    const $pane = $(this);
    return (
      $pane.find(".referenceTab").length > 0 &&
      $pane.find(".referenceTab img").length === 0
    );
  });
  if (referencesTabPane.length > 0) {
    referencesHtml = referencesTabPane.first().html() || undefined;
  }
  if (!referencesHtml) {
    referencesHtml = getSectionHtml($, "References", [
      ".referenceTab",
      ".referencesTab",
      ".references",
      "#referencesTab",
      "#references",
      ".tab-pane.references",
    ]);
  }

  // PEER Pearls tab - also uses .referenceTab but typically contains images/infographics
  let peerPearlsHtml: string | undefined;
  const peerPearlsTabPane = $(".tab-pane").filter(function (
    this: cheerio.Element
  ) {
    // Find tab-pane with .referenceTab that DOES contain images (PEER Pearl infographics)
    const $pane = $(this);
    return (
      $pane.find(".referenceTab").length > 0 &&
      $pane.find(".referenceTab img").length > 0
    );
  });
  if (peerPearlsTabPane.length > 0) {
    peerPearlsHtml = peerPearlsTabPane.first().html() || undefined;
  }
  if (!peerPearlsHtml) {
    peerPearlsHtml = getSectionHtml($, "PEER Pearl", [
      ".tab-pane.peer-pearls",
      "#peer-pearls",
    ]);
  }

  const images: QuestionImage[] = [];

  // Vignette images from fancybox links
  $("#media-links a.fancybox").each((_: number, el: cheerio.Element) => {
    const href = $(el).attr("href");
    if (href) {
      images.push({
        url: href.startsWith("http") ? href : new URL(href, url).href,
        localPath: "",
        location: "question",
      });
    }
  });

  // Section Image Extractor Helper
  const extractSectionImages = (
    selector: string,
    location: QuestionImage["location"]
  ) => {
    $(selector)
      .find("img")
      .each((_: number, el: cheerio.Element) => {
        const src = $(el).attr("src");
        if (src) {
          images.push({
            url: src.startsWith("http") ? src : new URL(src, url).href,
            localPath: "",
            caption: $(el).attr("alt") || undefined,
            location,
          });
        }
      });
  };

  extractSectionImages(
    "div.tab-pane:nth-child(1), .feedbackTab, .feedback-content, #feedbackTab, #reasoning, .tab-pane.reasoning, #explanation, .tab-pane.explanation, .rationale, #rationale, .discussion, #discussion, .commentary, #commentary, .analysis, #analysis, .tab-pane.analysis",
    "explanation"
  );
  extractSectionImages(
    "div.tab-pane:nth-child(2), .keyPointsTab, .key-points, #keyPointsTab, #related-text, .tab-pane.key-point, .bottom-line, #bottom-line, .tab-pane.bottom-line",
    "keypoint"
  );
  extractSectionImages(
    "div.tab-pane:nth-child(3), .referencesTab, .references, #referencesTab, #references, .tab-pane.references",
    "references"
  );
  extractSectionImages(
    "div.tab-pane:nth-child(4), .tab-pane.peer-pearls, #peer-pearls",
    "peerpearls"
  );

  return {
    source: "peerprep",
    questionId,
    capturedAt,
    sourceUrl: url,
    vignetteHtml: cleanedVignetteHtml,
    questionStemHtml,
    answers: finalAnswers,
    wasCorrect,
    explanationHtml,
    keyPointsHtml,
    referencesHtml,
    peerPearlsHtml,
    images,
    attempts: [],
    category: $(".breadcrumb, .category").text().trim() || undefined,
  };
}

/**
 * Parses MKSAP 19 questions.
 */
function parseMKSAP(
  $: cheerio.CheerioAPI,
  url: string,
  capturedAt: string
): BoardQuestionContent {
  // Extract questionId using multiple strategies
  let questionId: string | undefined = undefined;

  // Strategy 1: Try URL path segments (MKSAP often uses /questions/{id})
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const questionIndex = pathParts.indexOf("questions");
    if (questionIndex !== -1 && pathParts[questionIndex + 1]) {
      questionId = `mksap-${pathParts[questionIndex + 1]}`;
    }
  } catch (e) {
    console.warn("[MKSAP Parser] URL parsing failed:", e);
  }

  // Strategy 2: Look for data attributes or question header text
  if (!questionId) {
    questionId =
      $("[data-question-id]").attr("data-question-id") ||
      $(".question-header")
        .text()
        .match(/Question\s+(\d+)/)?.[1];

    if (questionId && !questionId.startsWith("mksap-")) {
      questionId = `mksap-${questionId}`;
    }
  }

  // 1. Vignette & Stem
  const vignetteEl = $(".question-text, .stem").first();
  const vignetteHtml = vignetteEl.html() || "";

  // Isolate question stem (often the last paragraph or sentence)
  let questionStemHtml = "";
  let cleanedVignetteHtml = vignetteHtml;

  const paragraphs = vignetteEl.find("p");
  if (paragraphs.length > 0) {
    const lastP = paragraphs.last();
    questionStemHtml = lastP.html() || lastP.text() || "";

    // Remove the question stem from the vignette to avoid double display
    // when sections are rendered separately.
    if (vignetteHtml.trim().endsWith(questionStemHtml.trim())) {
      lastP.remove();
      cleanedVignetteHtml = vignetteEl.html() || vignetteHtml;
    }
  } else if (vignetteHtml) {
    // If no paragraphs, attempt to split by last sentence
    const text = vignetteEl.text().trim();
    const sentences = text.split(/(?<=[.!?])\s+/);
    questionStemHtml =
      sentences.length > 0 ? sentences[sentences.length - 1] : vignetteHtml;
  }

  // Strategy 3: Final fallback - generate hash from vignette content
  if (!questionId) {
    questionId = generateQuestionHash(cleanedVignetteHtml);
    console.log(
      "[MKSAP Parser] No explicit questionId found, using content hash:",
      questionId
    );
  }

  // 2. Answers
  const answers: AnswerOption[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $(".answer-option").each((i: number, el: any) => {
    const $el = $(el);
    const letter =
      $el.attr("data-letter") ||
      $el.find(".letter").text().trim().replace(".", "") ||
      String.fromCharCode(65 + i);
    const html = $el.find(".option-content, .text").html() || $el.html() || "";
    const isCorrect = $el.hasClass("correct");
    const isUserChoice = $el.hasClass("selected");

    answers.push({
      letter,
      html: html.replace(/^[A-E]\.?\s*/, "").trim(), // Clean up leading letter if present
      isCorrect,
      isUserChoice,
    });
  });

  const finalAnswers = deduplicateAnswers(answers);
  const wasCorrect = finalAnswers.some((a) => a.isUserChoice && a.isCorrect);

  // 3. Explanation & Key Points
  const explanationHtml = $(".critique, .explanation").first().html() || "";
  const keyPointsHtml = $(".educational-objective").first().html() || undefined;

  // 4. Images
  const images: QuestionImage[] = [];
  const addImages = (
    containerSelector: string,
    location:
      | "vignette"
      | "question"
      | "explanation"
      | "keypoint"
      | "references"
      | "peerpearls"
  ) => {
    $(containerSelector)
      .find("img")
      .each((_: number, el: cheerio.Element) => {
        const src = $(el).attr("src");
        if (src) {
          images.push({
            url: src.startsWith("http") ? src : new URL(src, url).href,
            localPath: "",
            caption: $(el).attr("alt") || undefined,
            location,
          });
        }
      });
  };

  addImages(".question-text, .stem", "question");
  addImages(".critique, .explanation", "explanation");
  addImages(".educational-objective", "keypoint");

  // 5. Metadata
  let category = $("title").text().split("|")[0].trim();
  if (!category || category.toLowerCase().includes("mksap")) {
    category = $(".breadcrumb").first().text().trim() || "Internal Medicine";
  }

  return {
    source: "mksap",
    questionId,
    capturedAt,
    sourceUrl: url,
    vignetteHtml: cleanedVignetteHtml,
    questionStemHtml,
    answers: finalAnswers,
    wasCorrect,
    explanationHtml,
    keyPointsHtml,
    images,
    attempts: [],
    category,
  };
}
