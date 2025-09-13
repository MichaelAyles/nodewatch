import axios from 'axios';
import * as tar from 'tar';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

const NPM_REGISTRY = 'https://registry.npmjs.org';

export interface PackageMetadata {
  name: string;
  version: string;
  description?: string;
  dist: {
    tarball: string;
    shasum: string;
    integrity?: string;
  };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export class NpmFetcher {
  private cacheDir: string;

  constructor(cacheDir = './cache') {
    this.cacheDir = cacheDir;
  }

  async fetchPackageMetadata(name: string, version = 'latest'): Promise<PackageMetadata> {
    try {
      const url = `${NPM_REGISTRY}/${name}`;
      const response = await axios.get(url);
      
      const data = response.data;
      
      if (!version || version === 'latest') {
        version = data['dist-tags'].latest;
      }
      
      const versionData = data.versions[version];
      if (!versionData) {
        throw new Error(`Version ${version} not found for package ${name}`);
      }

      return {
        name: versionData.name,
        version: versionData.version,
        description: versionData.description,
        dist: versionData.dist,
        dependencies: versionData.dependencies,
        devDependencies: versionData.devDependencies,
      };
    } catch (error) {
      throw new Error(`Failed to fetch metadata for ${name}@${version}: ${error}`);
    }
  }

  async downloadTarball(tarballUrl: string, packageName: string, version: string): Promise<string> {
    const tarballPath = path.join(this.cacheDir, 'tarballs', `${packageName}-${version}.tgz`);
    
    await fs.mkdir(path.dirname(tarballPath), { recursive: true });
    
    // Check if already cached
    try {
      await fs.access(tarballPath);
      console.log(`Using cached tarball: ${tarballPath}`);
      return tarballPath;
    } catch {
      // Not cached, download it
    }

    console.log(`Downloading tarball from ${tarballUrl}`);
    const response = await axios.get(tarballUrl, { responseType: 'stream' });
    await pipeline(response.data, createWriteStream(tarballPath));
    
    return tarballPath;
  }

  async extractPackage(tarballPath: string, packageName: string, version: string): Promise<Map<string, string>> {
    const extractDir = path.join(this.cacheDir, 'extracted', `${packageName}-${version}`);
    await fs.mkdir(extractDir, { recursive: true });

    // Extract tarball
    await tar.x({
      file: tarballPath,
      cwd: extractDir,
    });

    // Read all files and create content map
    const contentMap = new Map<string, string>();
    await this.readDirectory(path.join(extractDir, 'package'), '', contentMap);
    
    return contentMap;
  }

  private async readDirectory(basePath: string, relativePath: string, contentMap: Map<string, string>) {
    const fullPath = path.join(basePath, relativePath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(relativePath, entry.name);
      const fullEntryPath = path.join(basePath, entryPath);

      if (entry.isDirectory()) {
        // Skip node_modules
        if (entry.name === 'node_modules') continue;
        await this.readDirectory(basePath, entryPath, contentMap);
      } else if (entry.isFile()) {
        // Only read text files
        if (this.isTextFile(entry.name)) {
          try {
            const content = await fs.readFile(fullEntryPath, 'utf-8');
            const hash = crypto.createHash('sha256').update(content).digest('hex');
            contentMap.set(entryPath, content);
          } catch (error) {
            console.warn(`Could not read file ${entryPath}: ${error}`);
          }
        }
      }
    }
  }

  private isTextFile(filename: string): boolean {
    const textExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.txt',
      '.yml', '.yaml', '.css', '.scss', '.html', '.xml',
      '.sh', '.bash', '.env', '.gitignore', '.npmignore'
    ];
    
    return textExtensions.some(ext => filename.endsWith(ext)) || 
           filename === 'LICENSE' || 
           filename === 'README';
  }

  calculateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}