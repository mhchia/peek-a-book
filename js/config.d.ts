export declare type TNetworkConfig = {
    contractAtBlock: number;
    contractAddress: string;
    etherscanURL: string;
};
export declare const networkConfig: {
    [network: string]: TNetworkConfig;
};
export declare const peerServerGetPeersURL: string;
