import type { ProviderDef, ProviderKey } from '../types';

/** LLM providers: each one only changes the package, the class, the API-key variable and the model name. */
export const PROVIDERS: Record<ProviderKey, ProviderDef> = {
  gemini: { label: 'Google Gemini', model: 'gemini-2.5-flash', pkg: 'langchain-google-genai', imp: 'from langchain_google_genai import ChatGoogleGenerativeAI', cls: 'ChatGoogleGenerativeAI', env: 'GOOGLE_API_KEY', keyUrl: 'https://aistudio.google.com/apikey' },
  claude: { label: 'Anthropic Claude', model: 'claude-sonnet-5-5', pkg: 'langchain-anthropic', imp: 'from langchain_anthropic import ChatAnthropic', cls: 'ChatAnthropic', env: 'ANTHROPIC_API_KEY', keyUrl: 'https://console.anthropic.com/' },
  openai: { label: 'OpenAI', model: 'gpt-4o-mini', pkg: 'langchain-openai', imp: 'from langchain_openai import ChatOpenAI', cls: 'ChatOpenAI', env: 'OPENAI_API_KEY', keyUrl: 'https://platform.openai.com/api-keys' },
  ollama: { label: 'Ollama (local, free)', model: 'llama3.1', pkg: 'langchain-ollama', imp: 'from langchain_ollama import ChatOllama', cls: 'ChatOllama', env: '', keyUrl: '' }
};

export const PROVIDER_KEYS = Object.keys(PROVIDERS) as ProviderKey[];

export const defaultModels = (): Record<ProviderKey, string> =>
  Object.fromEntries(PROVIDER_KEYS.map((k) => [k, PROVIDERS[k].model])) as Record<ProviderKey, string>;
