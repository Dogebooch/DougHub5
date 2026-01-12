import * as cheerio from 'cheerio';

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
 */
function getSectionHtml(
  $: any,
  searchTitle: string,
  selectors: string[]
): string | undefined {
  // First try direct selectors
  for (const selector of selectors) {
    const html = $(selector).html();
    if (html && html.trim().length > 0) return html;
  }

  // Then try searching by header text
  let foundHtml: string | undefined = undefined;

  // Look for headings or spans containing the search title
  $(":header, span, b, strong").each((_: number, el: any) => {
    const $el = $(el);
    const text = $el.text().trim().toLowerCase();
    if (text.includes(searchTitle.toLowerCase())) {
      // Often the content is in the next sibling or a parent's next sibling
      // This is a bit heuristic but common in qbank sites
      const content = $el.next().html() || $el.parent().next().html();
      if (content && content.trim().length > 10) {
        foundHtml = content;
        return false; // break loop
      }
    }
  });

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
  $: any,
  url: string,
  capturedAt: string
): BoardQuestionContent {
  const vignetteEl = $(".questionStem, .question-stem").first();
  const vignetteHtml = vignetteEl.html() || "";
  const lastP = vignetteEl.find("p").last();
  const questionStemHtml = lastP.html() || vignetteHtml;

  let cleanedVignetteHtml = vignetteHtml;
  if (vignetteHtml.trim().endsWith(questionStemHtml.trim())) {
    lastP.remove();
    cleanedVignetteHtml = vignetteEl.html() || vignetteHtml;
  }

  const answers: AnswerOption[] = [];
  const answerSelectors = [".choices li", ".answerOption", ".answer-choice"];

  let options = $([]);
  for (const selector of answerSelectors) {
    options = $(selector);
    if (options.length > 0) break;
  }

  options.each((i: number, el: any) => {
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
      $el.attr("class")?.includes("correct") ||
      false;
    const isUserChoice =
      $el.hasClass("active") ||
      $el.hasClass("selected") ||
      $el.hasClass("user-selected") ||
      $el.attr("class")?.includes("selected") ||
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
  const explanationHtml =
    getSectionHtml($, "Explanation", [
      ".feedbackTab",
      ".feedback-content",
      "#feedbackTab",
    ]) || "";
  const keyPointsHtml = getSectionHtml($, "Key Point", [
    ".keyPointsTab",
    ".key-points",
    "#keyPointsTab",
  ]);
  const referencesHtml = getSectionHtml($, "References", [
    ".referencesTab",
    ".references",
    "#referencesTab",
  ]);
  const peerPearlsHtml = getSectionHtml($, "PEER Pearl", [
    ".peerPearlsTab",
    ".peer-pearls",
    "#peerPearlsTab",
  ]);

  const images: QuestionImage[] = [];

  // Vignette images from fancybox links
  $("#media-links a.fancybox").each((_: number, el: any) => {
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
      .each((_: number, el: any) => {
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
    ".feedbackTab, .feedback-content, #feedbackTab",
    "explanation"
  );
  extractSectionImages(".keyPointsTab, .key-points, #keyPointsTab", "keypoint");
  extractSectionImages(
    ".referencesTab, .references, #referencesTab",
    "references"
  );
  extractSectionImages(
    ".peerPearlsTab, .peer-pearls, #peerPearlsTab",
    "peerpearls"
  );

  return {
    source: "peerprep",
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMKSAP(
  $: any,
  url: string,
  capturedAt: string
): BoardQuestionContent {
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
    location: "vignette" | "question" | "explanation" | "keypoint"
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $(containerSelector)
      .find("img")
      .each((_: number, el: any) => {
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
