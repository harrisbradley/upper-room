// js/auth.js
// Anonymous authentication helper

/**
 * Returns the current user, signing in anonymously if needed.
 * Firebase persists the anonymous session in IndexedDB, so the same
 * user comes back on subsequent visits from the same browser.
 */
function ensureAnonymousAuth() {
    return new Promise((resolve, reject) => {
        const unsub = auth.onAuthStateChanged(user => {
            unsub();
            if (user) {
                resolve(user);
            } else {
                auth.signInAnonymously()
                    .then(cred => resolve(cred.user))
                    .catch(reject);
            }
        });
    });
}
