export const networkConfig: {
  [network: string]: {
    contractAtBlock: number;
    contractAddress: string;
  };
} = {
  ropsten: {
    contractAtBlock: 8090511,
    contractAddress: '0x74EF33Eb7aa3fF607E18aa240dD7176574c62d23',
  },
};

const peerServerURL = 'https://peekabookpeerserver.mhchia.com:8000';
export const peerServerGetPeersURL = `${peerServerURL}/myapp/peerjs/peers`;
