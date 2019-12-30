import { Tag } from "./tag";

export class Favorite {

  public static list (): Favorite[] {
    return []
  }

  /*
   * @hideconstructor
   */
  constructor () {
    //
  }

  public async tags (): Promise<Tag []> {
    return []
  }

  public async findAll() {
    //
  }
}
