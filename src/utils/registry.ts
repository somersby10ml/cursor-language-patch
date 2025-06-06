// This is not supposed to be imported on macos.
import { existsSync } from 'fs';
import regedit from 'regedit';

interface RegistryValue {
  value: string | number | string[];
  type: string;
}

type RegistryValues = Record<string, RegistryValue>;

interface RegistryKey {
  keys: string[];
  values?: RegistryValues;
}

type RegistryResult = Record<string, RegistryKey>;

const queryRegistryItems = (paths: string[]): Promise<RegistryResult> => {
  return new Promise((resolve, reject) => {
    regedit.list(paths, (err, result) => {
      if (err) reject(err);
      else resolve(result as RegistryResult);
    });
  });
};

export async function getWindowsCursorIdeInstallPathMethod1(): Promise<string> {
  const registryPath = String.raw`HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\{DADADADA-ADAD-ADAD-ADAD-ADADADADADAD}}_is1`;
  const result = await queryRegistryItems([registryPath]);

  if (!result[registryPath]?.values) {
    throw new Error('Specified registry key not found');
  }

  const values = result[registryPath].values;
  const displayIcon = values.DisplayIcon?.value as string;

  if (!displayIcon || typeof displayIcon !== 'string' || !displayIcon.toLowerCase().endsWith('cursor\\cursor.exe')) {
    throw new Error('Invalid Cursor IDE DisplayIcon');
  }

  const installLocation = values.InstallLocation?.value as string;
  if (!installLocation) {
    throw new Error('InstallLocation not found');
  }

  if (!existsSync(installLocation)) {
    throw new Error('Installation path does not exist');
  }

  return installLocation;
}

export async function getWindowsCursorIdeInstallPathMethod2(): Promise<string> {
  try {
    const uninstallPath = String.raw`HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall`;
    const result = await queryRegistryItems([uninstallPath]);

    if (!result[uninstallPath]?.keys) {
      throw new Error('Registry path not found');
    }

    for (const key of result[uninstallPath].keys) {
      const subKeyPath = `${uninstallPath}\\${key}`;
      const subKey = await queryRegistryItems([subKeyPath]);

      const values = subKey[subKeyPath]?.values;
      if (values?.DisplayIcon?.value) {
        const displayIcon = values.DisplayIcon.value as string;
        if (displayIcon.toLowerCase().endsWith('cursor\\cursor.exe')) {
          return displayIcon.replace('\\Cursor.exe', '');
        }
      }
    }

    throw new Error('Cursor IDE installation path not found');
  }
  catch (error) {
    console.error('Error occurred during registry search:', error);
    throw error;
  }
}
