declare module "@folder/xdg" {
  interface XDGOptions {
    platform?: string;
    env?: NodeJS.ProcessEnv;
    subdir?: string;
    tempdir?: string;
    homedir?: string;
    expanded?: boolean;
    resolve?: (path: string, ...args: string[]) => string;
    roaming?: boolean;
  }

  interface XDGPaths {
    cache: string;
    state: string;
    config: string;
    config_dirs: string[];
    data: string;
    data_dirs: string[];
    runtime: string;
    logs: string;
    create?: (...args: any[]) => any;
    load?: (pathname: string, config: any, options?: any) => any;
  }

  interface XDGUserDirs {
    [key: string]: string;
  }

  interface XDGFunction {
    (options?: XDGOptions): XDGPaths;
    darwin: (options?: XDGOptions) => XDGPaths;
    linux: (options?: XDGOptions) => XDGPaths;
    win32: (options?: XDGOptions) => XDGPaths;
    windows: (options?: XDGOptions) => XDGPaths;
    macos: (options?: XDGOptions) => XDGPaths;
    load: (...args: any[]) => any;
    resolve: (path: string, ...args: string[]) => string;
    userdirs: XDGUserDirs;
  }

  const xdg: XDGFunction;
  export = xdg;
}
