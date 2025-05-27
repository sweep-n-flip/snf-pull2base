import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const collection = searchParams.get('collection') || 'Collection';
  const currentRoyalty = searchParams.get('current') || '250';
  
  const royaltyPercent = (parseInt(currentRoyalty) / 100).toFixed(1);

  // Generate a simple HTML page that will be converted to image
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            margin: 0;
            padding: 40px;
            width: 1200px;
            height: 630px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-family: 'Arial', sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            box-sizing: border-box;
          }
          .title {
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          .subtitle {
            font-size: 32px;
            margin-bottom: 30px;
            opacity: 0.9;
          }
          .collection {
            font-size: 28px;
            background: rgba(255,255,255,0.2);
            padding: 15px 30px;
            border-radius: 15px;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
          }
          .current {
            font-size: 24px;
            opacity: 0.8;
          }
          .options {
            font-size: 20px;
            margin-top: 20px;
            opacity: 0.7;
          }
        </style>
      </head>
      <body>
        <div class="title">🎯 Set Your Referral Rate</div>
        <div class="collection">${collection}</div>
        <div class="subtitle">Current: ${royaltyPercent}%</div>
        <div class="current">Choose your earning percentage</div>
        <div class="options">1% • 2.5% • 5% • Custom</div>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
