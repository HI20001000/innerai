import axios from 'axios';
import { config } from '../config.js';

export interface DifyFollowUpItem {
  title: string;
  description?: string;
  suggestedOwner?: string;
  dueDate?: string | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
}

export interface DifyResult {
  summary: string;
  followUps: DifyFollowUpItem[];
}

export const buildDifyPrompt = (meetingContent: string) => {
  const schema = {
    summary: 'string: concise summary of the meeting (<= 120 words)',
    followUps: [
      {
        title: 'string: actionable follow-up item',
        description: 'string: details on what to do',
        suggestedOwner: 'string: name or role of the suggested responsible person',
        dueDate: 'string | null: YYYY-MM-DD if available, otherwise null',
        priority: 'LOW | MEDIUM | HIGH | null',
      },
    ],
  };

  return `You are an assistant that extracts structured follow-up tasks from meeting notes.\n` +
    `Return ONLY strict JSON matching this schema with double quotes and no comments.\n` +
    `If information is missing, set the value to null or an empty string.\n` +
    `Meeting content: <<<${meetingContent}>>>\n` +
    `Expected JSON shape: ${JSON.stringify(schema, null, 2)}\n` +
    `Response MUST be valid JSON with keys: summary, followUps (array).`;
};

const parseJsonSafely = (raw: string): DifyResult => {
  try {
    const parsed = JSON.parse(raw);
    const followUps = Array.isArray(parsed.followUps) ? parsed.followUps : [];
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      followUps: followUps.map((item) => ({
        title: typeof item?.title === 'string' ? item.title : 'Untitled follow up',
        description: typeof item?.description === 'string' ? item.description : undefined,
        suggestedOwner: typeof item?.suggestedOwner === 'string' ? item.suggestedOwner : undefined,
        dueDate: typeof item?.dueDate === 'string' ? item.dueDate : null,
        priority: item?.priority === 'LOW' || item?.priority === 'MEDIUM' || item?.priority === 'HIGH' ? item.priority : null,
      })),
    };
  } catch (error) {
    return { summary: '', followUps: [] };
  }
};

export const callDifyAnalysis = async (meetingContent: string): Promise<DifyResult> => {
  if (!config.dify.baseUrl || !config.dify.apiKey) {
    return { summary: '', followUps: [] };
  }

  const prompt = buildDifyPrompt(meetingContent);
  try {
    const response = await axios.post(
      `${config.dify.baseUrl}${config.dify.chatEndpoint}`,
      {
        inputs: {
          meeting_content: meetingContent,
        },
        response_mode: 'blocking',
        query: prompt,
        user: 'meeting-analysis',
      },
      {
        headers: {
          Authorization: `Bearer ${config.dify.apiKey}`,
        },
        maxBodyLength: config.dify.tokenLimit,
      },
    );

    const answer =
      (typeof response.data?.answer === 'string' && response.data.answer) ||
      (typeof response.data?.data?.[0]?.text === 'string' && response.data.data[0].text) ||
      '';

    return parseJsonSafely(answer);
  } catch (error) {
    // Avoid logging API key
    // eslint-disable-next-line no-console
    console.error('Failed to call Dify', (error as Error).message);
    return { summary: '', followUps: [] };
  }
};
