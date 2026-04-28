import { useState } from 'react';
import { 
  StellarWalletsKit, 
  Networks 
} from '@creit.tech/stellar-wallets-kit';
import { FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { xBullModule } from '@creit.tech/stellar-wallets-kit/modules/xbull';
import { AlbedoModule } from '@creit.tech/stellar-wallets-kit/modules/albedo';

// Initialize the kit globally with the static method
StellarWalletsKit.init({
  network: Networks.TESTNET,
  modules: [new FreighterModule(), new xBullModule(), new AlbedoModule()],
});

export const useWallet = () => {
  const [address, setAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const connect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      // Version 2 uses the static authModal method to connect
      const { address } = await StellarWalletsKit.authModal();
      setAddress(address);
    } catch (err) {
      setError(err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      await StellarWalletsKit.disconnect();
    } catch(e) {}
    setAddress(null);
  };

  const signTransaction = async (xdr) => {
    // Version 2 uses static signTransaction returning signedTxXdr
    const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr);
    return signedTxXdr;
  };

  return { address, isConnecting, error, connect, disconnect, signTransaction };
};
