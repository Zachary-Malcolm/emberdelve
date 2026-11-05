/*
 * Every biome lives in its own file in this folder: palette, enemy models + stats, room decor.
 * To add a biome: copy one of these files, give it a new key and new enemy ids, and add it to
 * BIOME_LIST below. The order of BIOME_LIST is the unlock order (beat a boss to open the next).
 * `tier` raises enemy levels (+3 per tier) and the rarity odds in chests.
 */
import * as hollow from './hollow.js';
import * as grotto from './grotto.js';
import * as cinder from './cinder.js';

export const BIOME_LIST = [hollow, grotto, cinder];
