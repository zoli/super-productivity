import {Injectable} from '@angular/core';
import auth from 'solid-auth-client';

@Injectable({
  providedIn: 'root'
})
export class SolidService {

  constructor() {
    this._checkSession();
  }


  async signIn(): Promise<string> {
    /* 1. Check if we've already got the user's WebID and access to their Pod: */
    const session = await auth.currentSession();
    console.log(session);
    if (session) {
      return session.webId;
    }

    /* 2. User has not logged in; ask for their Identity Provider: */
    // Implement `getIdentityProvider` to get a string with the user's Identity Provider (e.g.
    // `https://inrupt.net` or `https://solid.community`) using a method of your choice.
    // const identityProvider = await getIdentityProvider();
    const identityProvider = 'https://solid.community';

    /* 3. Initiate the login process - this will redirect the user to their Identity Provider: */
    return auth.login(identityProvider);
  }


  async getName(webId) {
    /* 1. Fetch the Document at `webId`: */
    const webIdDoc = await fetchDocument(webId);
    /* 2. Read the Subject representing the current user's profile: */
    const profile = webIdDoc.getSubject(webId);
    /* 3. Get their foaf:name: */
    return profile.getString('http://xmlns.com/foaf/0.1/name');
  }

  private async _checkSession() {
    const session = await auth.currentSession();
    console.log(session);
  }
}
