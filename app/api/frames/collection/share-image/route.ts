import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const collection = searchParams.get('collection') || 'Collection';
  const royalty = searchParams.get('royalty') || '2.5';
  const floor = searchParams.get('floor') || 'N/A';
  const cheapest = searchParams.get('cheapest') || 'N/A';

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
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
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
            font-size: 44px;
            font-weight: bold;
            margin-bottom: 25px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          .collection {
            font-size: 36px;
            background: rgba(255,255,255,0.2);
            padding: 20px 40px;
            border-radius: 20px;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
          }
          .stats {
            display: flex;
            gap: 40px;
            margin-bottom: 30px;
          }
          .stat {
            background: rgba(255,255,255,0.15);
            padding: 15px 25px;
            border-radius: 15px;
            font-size: 20px;
            backdrop-filter: blur(5px);
          }
          .royalty {
            font-size: 32px;
            background: rgba(255,215,0,0.3);
            padding: 15px 30px;
            border-radius: 15px;
            margin-bottom: 20px;
          }
          .instructions {
            font-size: 22px;
            opacity: 0.9;
          }
        </style>
      </head>
      <body>
        <div class="title">🚀 Ready to Share & Earn!</div>
        <div class="collection">${collection}</div>
        <div class="stats">
          <div class="stat">Floor: ${floor}</div>
          <div class="stat">Cheapest: ${cheapest}</div>
        </div>
        <div class="royalty">💰 You earn ${royalty}% on sales</div>
        <div class="instructions">Share your link and start earning!</div>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
