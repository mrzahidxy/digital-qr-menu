// Use the pure-JS bcrypt implementation already present in the workspace.
// The native `bcrypt` binary shipped in this environment is built for Windows
// and fails to load under the current Linux/WSL runtime.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('../../../client/node_modules/bcryptjs') as {
  hash: (plain: string, saltRounds: number) => Promise<string>;
  compare: (plain: string, hash: string) => Promise<boolean>;
};

const SALT_ROUNDS = 10;

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, SALT_ROUNDS);

export const comparePassword = (plain: string, hash: string): Promise<boolean> => bcrypt.compare(plain, hash);
