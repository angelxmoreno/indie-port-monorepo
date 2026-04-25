import type { AuthenticatedUser } from '@indieport/shared-types';

export type Env = {
    Variables: {
        user: AuthenticatedUser;
    };
};
