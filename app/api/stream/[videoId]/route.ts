import play from 'play-dl';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;
  
  if (!videoId) {
    return new NextResponse('Missing videoId', { status: 400 });
  }

  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Fetch stream using play-dl (often bypasses basic bot protections)
    const streamInfo = await play.stream(url);
    const stream = streamInfo.stream;

    // Convert Node.js stream to Web Stream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      }
    });

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': streamInfo.type === 'opus' ? 'audio/ogg' : 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error streaming audio:', error);
    return new NextResponse('Error streaming audio', { status: 500 });
  }
}
