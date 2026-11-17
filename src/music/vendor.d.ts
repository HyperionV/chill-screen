/** The parts of Google's sign-in library and YouTube's player script that this app uses. */

declare namespace google.accounts.oauth2 {
  interface TokenResponse {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  }
  interface TokenClient {
    requestAccessToken(overrides?: { prompt?: '' | 'consent' | 'select_account' }): void;
  }
  function initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string; message?: string }) => void;
  }): TokenClient;
  function revoke(token: string, done?: () => void): void;
}

declare namespace YT {
  interface PlayerEvent {
    target: Player;
    data: number;
  }
  class Player {
    constructor(
      el: HTMLElement,
      options: {
        width?: number | string;
        height?: number | string;
        playerVars?: Record<string, string | number>;
        events?: {
          onReady?: (e: PlayerEvent) => void;
          onStateChange?: (e: PlayerEvent) => void;
          onError?: (e: PlayerEvent) => void;
        };
      },
    );
    loadVideoById(id: string): void;
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    getCurrentTime(): number;
    getDuration(): number;
    setVolume(volume: number): void;
  }
}

interface Window {
  onYouTubeIframeAPIReady?: () => void;
}
