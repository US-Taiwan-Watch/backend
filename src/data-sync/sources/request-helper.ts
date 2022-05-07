import request from "request";

export type ContentType = 'xml' | 'txt' | 'pdf' | 'jpg';

export abstract class RequestHelper {
  public static get(url: string, options: request.CoreOptions | undefined = undefined): Promise<any> {
    return new Promise((resolve, reject) => {
      request.get(url, options, (err, response, body) => {
        if (err || response.statusCode !== 200) {
          // TODO: log
          reject(err);
        } else {
          resolve(body);
        }
      });
    });
  }

  public static async getFile(
    url: string,
    contentType: ContentType,
    options: request.CoreOptions | undefined = undefined
  ): Promise<Buffer> {
    if (contentType === 'pdf' || contentType === 'jpg') {
      options = { ...options, encoding: null }
    }
    const content = await this.get(url, options);
    return content as Buffer;
  }

}