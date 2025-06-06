#!/usr/bin/env node

import { isCancel, select } from '@clack/prompts';
import { Command } from 'commander';
import { osLocale } from 'os-locale';
import { langs } from '../lang/lang';
import type { CursorTranslator } from './cursorTranslateService/CursorTranslator';
import { MacCursorTranslateService } from './cursorTranslateService/MacCursorTranslator';
import { WindowsCursorTranslateService } from './cursorTranslateService/WindowsCursorTranslator';
import cursorTranslatorMain from './cursorTranslatorMain.js.file' with { type: 'text' };
import { getMacCursorIdeInstallPath, getWindowsCursorIdeInstallPath } from './utils/platform';

const supportedLanguages = langs.map((l) => l.LOCALE.toLowerCase());

interface CommandLineOptions {
  lang: string;
}

function main() {
  const program = new Command();

  program
    .name('cursor-i18n')
    .description('CLI tool')
    .version('0.0.3-alpha.11', '-v, --version', 'Show version information');

  program
    .command('apply')
    .description('Apply language patch')
    .option('-l, --lang <language>', 'language setting(e.g ko-kr)', 'auto')
    .action((options: CommandLineOptions) => {
      void applyOrRevertLanguagePatch('apply', options.lang);
    });

  program
    .command('revert')
    .description('Revert language patch')
    .action(() => {
      void applyOrRevertLanguagePatch('revert');
    });

  program
    .command('list')
    .description('List available languages')
    .action(() => {
      void listAvailableLanguages();
    });

  program.parse();
}

async function getCursorTranslator(): Promise<CursorTranslator> {
  if (process.platform === 'win32') {
    const installPath = await getWindowsCursorIdeInstallPath();
    return new WindowsCursorTranslateService(installPath, cursorTranslatorMain);
  }
  else if (process.platform === 'darwin') {
    const installPath = getMacCursorIdeInstallPath();
    return new MacCursorTranslateService(installPath, cursorTranslatorMain);
  }
  else {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

async function applyLanguagePatch(lang: string) {
  const detectLang = (await osLocale()).toLocaleLowerCase();
  let appliedLang = '';

  if (lang === 'auto') {
    const result = await select({
      message: 'Choose: <arrow keys> to navigate, <enter> to confirm',
      options: supportedLanguages.map((l) => ({
        value: l,
        label: l === detectLang ? `${l} (Recommended)` : l,
      })),
      initialValue: detectLang,
    });

    if (isCancel(result)) {
      console.log('❌ Language selection cancelled.');
      return;
    }

    appliedLang = result;
  }
  else {
    appliedLang = lang.toLowerCase();
  }

  console.log(`🌍 Applying language patch for: ${appliedLang}`);
  const applyLang = langs.find((l) => l.LOCALE.toLowerCase() === appliedLang);
  if (!applyLang) {
    console.error(`❌ Language "${appliedLang}" not found in supported languages.`);
    await listAvailableLanguages();
    return;
  }

  const translator = await getCursorTranslator();
  if (!translator.isSupported(process.platform)) {
    console.error(`❌ ${translator.constructor.name} is not supported on this platform.`);
    return;
  }

  translator.install(applyLang.REPLACEMENTS);
  console.log('✅ Language patch applied successfully.');
}

async function revertLanguagePatch() {
  const translator = await getCursorTranslator();
  if (!translator.isSupported(process.platform)) {
    console.error(`❌ ${translator.constructor.name} is not supported on this platform.`);
    return;
  }

  translator.uninstall();
}

async function listAvailableLanguages(): Promise<void> {
  if (supportedLanguages.length === 0) {
    console.log('No languages available.');
    return;
  }

  const recommendedLanguage = (await osLocale()).toLocaleLowerCase();
  console.log('\nAvailable languages:');
  for (const lang of supportedLanguages) {
    if (lang.toLowerCase() === recommendedLanguage) {
      console.log(`✅ ${lang} (Recommended)`);
    }
    else {
      console.log(`ℹ️  ${lang}`);
    }
  }
}

async function applyOrRevertLanguagePatch(action: 'apply' | 'revert', lang?: string): Promise<void> {
  const supportedPlatforms = ['win32', 'darwin'];

  // Check the current platform
  if (!supportedPlatforms.includes(process.platform)) {
    console.error('Current Platform:', process.platform);
    console.error('❌ Currently only Windows and MacOS are supported.');
    return;
  }

  console.log(`🖥️ Current platform: ${process.platform}`);
  const locale = await osLocale();
  console.log(`🌍 Detected system locale: ${locale}`);

  if (action === 'apply') {
    await applyLanguagePatch(lang ?? 'auto');
  }
  else {
    await revertLanguagePatch();
  }
}

main();
