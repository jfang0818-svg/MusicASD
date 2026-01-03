import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://127.0.0.1:8000';

// Increase max duration for long-running requests like music generation
export const maxDuration = 300; // 5 minutes

// Long-running endpoints that need extended timeout
const LONG_RUNNING_PATHS = ['music/generate', 'ai-session-planner', 'ai-activity-generator'];

async function proxyRequest(request: NextRequest, path: string[]) {
  const targetPath = '/' + path.join('/');
  const url = new URL(targetPath, BACKEND_URL);

  // Forward query parameters
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    // Skip host header
    if (key.toLowerCase() !== 'host') {
      headers.set(key, value);
    }
  });

  // Determine timeout based on path
  const isLongRunning = LONG_RUNNING_PATHS.some(p => targetPath.includes(p));
  const timeoutMs = isLongRunning ? 300000 : 30000; // 5 min for long, 30s for normal

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
    signal: controller.signal,
  };

  // Include body for non-GET/HEAD requests
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    fetchOptions.body = await request.text();
  }

  try {
    const response = await fetch(url.toString(), fetchOptions);
    clearTimeout(timeoutId);
    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('Proxy error:', error);

    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout - backend took too long to respond' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Backend server unavailable' },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}
