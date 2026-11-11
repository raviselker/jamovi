
'use strict';

import ProgressStream from '../utils/progressstream';

export function events() {
    return new ProgressStream(async () => undefined);
}

export function promptSignIn(opts) {

}

// the signed in user, where there's sign in (jamovi cloud)
export interface IUser {
    name: string;
    email: string;
    plan?: string;
    picture?: string;
    // where the user manages their subscriptions
    manageUrl?: string;
}

export function currentUser(): IUser | null {
    return null;
}

export async function getAuthToken(forceRefresh = false) {
    return null;
}

export async function signOut() {

}

export async function waitForSignIn() {

}

export function init() {

}

// called once the instance has connected. an instance can't connect without a
// session, so before this there's no pod to send anything to.
export function beginSync() {

}

export interface IEmbedOptions {
    channelId: number;
}

export async function embed(options: IEmbedOptions): Promise<{ [x: string]: any }> {
    return { };
}

export default { init, beginSync, currentUser, events, getAuthToken, signOut, promptSignIn, waitForSignIn, embed };
