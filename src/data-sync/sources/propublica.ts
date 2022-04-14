import request from "request";

export class ProPublicaHelper {
  public static get<T>(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      request.get(url, {
        headers: {
          'x-api-key': 'update with the real key'
        }
      }, (err, response, body) => {
        if (err || response.statusCode !== 200) {
          reject(err);
        } else {
          resolve(JSON.parse(body).results);
        }
      });
    });
  }

}