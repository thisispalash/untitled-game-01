'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Web3Auth, decodeToken } from '@web3auth/single-factor-auth';
import { ADAPTER_EVENTS, CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from '@web3auth/base';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
import Web3 from 'web3';

import { v4 as uuidv4 } from 'uuid';

export const Web3AuthContext = createContext<any>(null);

const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID ?? '';

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: '0xaa36a7',
  rpcTarget: 'https://ethereum-sepolia-rpc.publicnode.com	',
  displayName: 'Ethereum Sepolia',
  blockExplorer: 'https://sepolia.etherscan.io/',
  ticker: 'ETH',
  tickerName: 'Ethereum',
}

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig },
});

const web3auth = new Web3Auth({
  clientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
  privateKeyProvider,
  usePnPKey: false,
});


export default function Web3AuthProvider({ children }: any) {

  const [ uuid, setUuid ] = useState('');
  const [ address, setAddress ] = useState('');
  const [ loggedIn, setLoggedIn ] = useState(false);
  const [ provider, setProvider ] = useState<IProvider | null>(null);

  const pregenerateWallet = async () => {

    const uuid = uuidv4();
    setUuid(uuid);

    const lookupURL = `https://lookup.web3auth.io/lookup?verifier=untitled-game-01-discord-verifier&verifierId=${uuid}&web3AuthNetwork=sapphire_devnet&clientId=${process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID}&`;

    const res = await fetch(lookupURL);
    const data = await res.json();

    console.log('data:', data);

    if (data.success) {
      setAddress(data.data.evmAddress);
    }

  }

  const signInWithDiscord = async () => {
    /// @dev flaw in pregeneration as each reload would generate a new uuid, 
    ///  and hence, new wallet. Need some way to store uuid in some db and 
    ///  associate with discord id.
    // if (!uuid) { await pregenerateWallet(); }
    // window.location.href = `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Flogin%2Fdiscord&scope=identify+email&state=${uuid}`;
    
    window.location.href = `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Flogin%2Fdiscord&scope=identify+email`;
  }

  const login = async (token: string) => {

    const { payload } = decodeToken(token);
    localStorage.setItem('token', token);
    localStorage.setItem('payload', JSON.stringify(payload));

    try {
      const web3authProvider = await web3auth.connect({
        verifier: 'untitled-game-01-discord-verifier',
        verifierId: (payload as any).sub,
        idToken: token,
      });

      console.log('web3authProvider:', web3authProvider);

      if (web3authProvider) {
        setProvider(web3authProvider);
        setLoggedIn(true);
        getUserInfo();
      }
    } catch (error) {
      console.log('error in login');
      console.error(error);
    }

  }


  const getUserInfo = async () => {
    console.log('getting user info');
    const user = await web3auth.getUserInfo();
    console.log(user);
  }


  useEffect(() => {
    const init = async () => {
      try {
        if (web3auth.status !== 'ready') {
          await web3auth.init();
          setProvider(web3auth.provider);
        }

        if (web3auth.status === ADAPTER_EVENTS.CONNECTED) {
          setLoggedIn(true);
        }

      } catch (error) {
        console.log('error in initizalizing web3auth');
        console.error(error);
      }
    }

    init();
  }, []);

  useEffect(() => {

    const url = new URL(window.location.href);
    const params = url.searchParams;
  
    const token = params.get('token');

    if (token) {
      login(token);
    }

  }, []);

  return (
    <Web3AuthContext.Provider 
      value={{
        signInWithDiscord,
      }}
    >
      {children}
    </Web3AuthContext.Provider>
  );
}


export const useWeb3Auth = () => {
  const ctx = useContext(Web3AuthContext);
  if (!ctx) {
    throw new Error('useWeb3Auth must be used within a Web3AuthProvider');
  }
  return ctx;
};