import * as cheerio from 'cheerio';

export interface BoardQuestionContent {
  source: 'peerprep' | 'mksap';
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
  location: 'vignette' | 'explanation' | 'keypoint';
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
  siteName: 'ACEP PeerPrep' | 'MKSAP 19',
  url: string,
  capturedAt: string
): BoardQuestionContent {
  const $ = cheerio.load(html);

  switch (siteName) {
    case 'ACEP PeerPrep':
      return parsePeerPrep($, url, capturedAt);
    case 'MKSAP 19':
      return parseMKSAP($, url, capturedAt);
    default:
      throw new Error(`Unsupported site: ${siteName}`);
  }
}

/**
 * Stub for parsing ACEP PeerPrep questions.
 * Implementation planned for T124.6.
 */
function parsePeerPrep($: any, url: string, capturedAt: string): BoardQuestionContent {
  const vignetteHtml = $('.questionStem, .question-stem').html() || '';
  const questionStemHtml = $('.questionStem p, .question-stem p').last().html() || vignetteHtml;

  const answers: AnswerOption[] = [];
  $('.answerOption, .answer-choice').each((i: number, el: any) => {
    const $el = $(el);
    const letter = $el.find('.letter, [class*="letter"]').text().trim() || String.fromCharCode(65 + i);
    const html = $el.find('.answer-text, .content').html() || $el.html() || '';
    const isCorrect = $el.hasClass('correct-answer') || $el.attr('class')?.includes('correct') || false;
    const isUserChoice = $el.hasClass('selected') || $el.hasClass('user-selected') || $el.attr('class')?.includes('selected') || false;

    const peerText = $el.find('.peer-response, .percentage').text();
    const peerPercent = parseFloat(peerText.replace(/[^0-9.]/g, '')) || undefined;

    answers.push({ letter, html, isCorrect, isUserChoice, peerPercent });
  });

  const wasCorrect = answers.some(a => a.isUserChoice && a.isCorrect);
  const explanationHtml = $('.feedbackTab, .feedback-content').html() || '';
  const keyPointsHtml = $('.keyPointsTab, .key-points').html() || undefined;

  const images: QuestionImage[] = [];

  // Vignette images from fancybox links
  $('#media-links a.fancybox').each((_: number, el: any) => {
    const href = $(el).attr('href');
    if (href) {
      images.push({
        url: href.startsWith('http') ? href : new URL(href, url).href,
        localPath: '',
        location: 'vignette'
      });
    }
  });

  // Explanation and Keypoint images
  $('.feedbackTab img, .feedback-content img').each((_: number, el: any) => {
    const src = $(el).attr('src');
    if (src) {
      images.push({
        url: src.startsWith('http') ? src : new URL(src, url).href,
        localPath: '',
        location: 'explanation'
      });
    }
  });

  $('.keyPointsTab img, .key-points img').each((_: number, el: any) => {
    const src = $(el).attr('src');
    if (src) {
      images.push({
        url: src.startsWith('http') ? src : new URL(src, url).href,
        localPath: '',
        location: 'keypoint'
      });
    }
  });

  return {
    source: 'peerprep',
    capturedAt,
    sourceUrl: url,
    vignetteHtml,
    questionStemHtml,
    answers,
    wasCorrect,
    explanationHtml,
    keyPointsHtml,
    images,
    attempts: [],
    category: $('.breadcrumb, .category').text().trim() || undefined
  };
}

/**
 * Parses MKSAP 19 questions.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMKSAP($: any, url: string, capturedAt: string): BoardQuestionContent {
  // 1. Vignette & Stem
  const vignetteEl = $('.question-text, .stem').first();
  const vignetteHtml = vignetteEl.html() || '';

  // Isolate question stem (often the last paragraph or sentence)
  let questionStemHtml = '';
  const paragraphs = vignetteEl.find('p');
  if (paragraphs.length > 0) {
    const lastP = paragraphs.last();
    questionStemHtml = lastP.html() || lastP.text() || '';
  } else if (vignetteHtml) {
    // If no paragraphs, attempt to split by last sentence
    const text = vignetteEl.text().trim();
    const sentences = text.split(/(?<=[.!?])\s+/);
    questionStemHtml = sentences.length > 0 ? sentences[sentences.length - 1] : vignetteHtml;
  }

  // 2. Answers
  const answers: AnswerOption[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $('.answer-option').each((i: number, el: any) => {
    const $el = $(el);
    const letter = $el.attr('data-letter') || $el.find('.letter').text().trim().replace('.', '') || String.fromCharCode(65 + i);
    const html = $el.find('.option-content, .text').html() || $el.html() || '';
    const isCorrect = $el.hasClass('correct');
    const isUserChoice = $el.hasClass('selected');

    answers.push({
      letter,
      html: html.replace(/^[A-E]\.?\s*/, '').trim(), // Clean up leading letter if present
      isCorrect,
      isUserChoice
    });
  });

  const wasCorrect = answers.some(a => a.isUserChoice && a.isCorrect);

  // 3. Explanation & Key Points
  const explanationHtml = $('.critique, .explanation').first().html() || '';
  const keyPointsHtml = $('.educational-objective').first().html() || undefined;

  // 4. Images
  const images: QuestionImage[] = [];
  const addImages = (containerSelector: string, location: 'vignette' | 'explanation' | 'keypoint') => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $(containerSelector).find('img').each((_: number, el: any) => {
      const src = $(el).attr('src');
      if (src) {
        images.push({
          url: src.startsWith('http') ? src : new URL(src, url).href,
          localPath: '',
          caption: $(el).attr('alt') || undefined,
          location
        });
      }
    });
  };

  addImages('.question-text, .stem', 'vignette');
  addImages('.critique, .explanation', 'explanation');
  addImages('.educational-objective', 'keypoint');

  // 5. Metadata
  let category = $('title').text().split('|')[0].trim();
  if (!category || category.toLowerCase().includes('mksap')) {
    category = $('.breadcrumb').first().text().trim() || 'Internal Medicine';
  }

  return {
    source: 'mksap',
    capturedAt,
    sourceUrl: url,
    vignetteHtml,
    questionStemHtml,
    answers,
    wasCorrect,
    explanationHtml,
    keyPointsHtml,
    images,
    attempts: [],
    category
  };
}
