import { NextRequest, NextResponse } from 'next/server';
import { generateKeyPairSync } from 'crypto';
import jwt from 'jsonwebtoken';

const discordIdentifyURL = 'https://discord.com/api/users/@me';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

export async function GET(req: NextRequest) {

  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  console.log('received discord code:', code);
  
  // get access_token
  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ?? '',
      client_secret: process.env.DISCORD_CLIENT_SECRET ?? '',
      grant_type: 'authorization_code',
      code: code ?? '',
      redirect_uri: 'http://localhost:3000/api/login/discord',
      scope: 'identify email',
    })
  });

  console.log('response from discord:', res.status);
  const data = await res.json();
  console.log(data);


  // refresh token (since expiry is 7 days)
  const refresh = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ?? '',
      client_secret: process.env.DISCORD_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
      refresh_token: data.refresh_token,
      redirect_uri: 'http://localhost:3000/api/login/discord',
      scope: 'identify email',
    })
  });

  console.log('refresh response:', refresh.status);
  const refreshData = await refresh.json();
  console.log(refreshData);

  const user =  await fetch(discordIdentifyURL, {
    headers: {
      'Authorization': `${refreshData.token_type} ${refreshData.access_token}`,
    }
  });

  console.log('user data:', user.status);
  const userData = await user.json();
  console.log(userData);

  const jwtData = {
    sub: userData.id,
    name: userData.global_name,
    username: userData.username,
    avatar: userData.avatar,
    verified: userData.verified,
    access_token: refreshData.access_token,
    refresh_token: refreshData.refresh_token,
    aud: 'urn:untitled-game-01',
    iss: 'http://localhost:3000',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + refreshData.expires_in - 60,
  }

  const jwtToken = jwt.sign(jwtData, privateKey, { algorithm: 'RS256' });
  console.log('jwt created!', jwtToken);

  return new NextResponse('redirecting...', {
    status: 302,
    headers: {
      'Location': `http://localhost:3000/?token=${jwtToken}`,
    },
  });
}
