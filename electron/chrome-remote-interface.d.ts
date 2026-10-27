declare module "chrome-remote-interface" {
  type CDPOptions = { port?: number; target?: string; host?: string };

  type CDPClient = {
    close(): Promise<void>;
    Network: { enable(): Promise<void> };
    Page: {
      enable(): Promise<void>;
      navigate(params: { url: string }): Promise<void>;
      loadEventFired(): Promise<void>;
      bringToFront(): Promise<void>;
    };
    Input: {
      dispatchMouseEvent(params: {
        type: string;
        x: number;
        y: number;
        button?: string;
        clickCount?: number;
      }): Promise<void>;
      insertText(params: { text: string }): Promise<void>;
      dispatchKeyEvent(params: {
        type: string;
        key?: string;
        code?: string;
        windowsVirtualKeyCode?: number;
      }): Promise<void>;
    };
    Runtime: {
      evaluate(params: {
        expression: string;
        returnByValue?: boolean;
      }): Promise<unknown>;
    };
  };

  function CDP(options?: CDPOptions): Promise<CDPClient>;
  export default CDP;
}
