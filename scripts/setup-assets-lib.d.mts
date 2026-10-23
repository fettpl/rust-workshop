export declare const upstreamNoticeFiles: readonly string[];
export declare function copyMonacoDistribution(options: {
  sourceRoot: string;
  destinationRoot: string;
  sanitizerRoot?: string;
  promote?: (source: string, destination: string) => Promise<void>;
}): Promise<void>;
