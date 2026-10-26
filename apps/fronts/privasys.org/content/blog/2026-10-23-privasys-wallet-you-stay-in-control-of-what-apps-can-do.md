---
title: "Privasys Wallet: You Stay in Control of What Apps Can Do"
author: "B Foing"
date: "2026-10-23"
---

Signing in and granting permissions are where an identity system meets the people using it most often, and where most of the decisions about their privacy are made: what an application may know, what it may do, and how to take that back. Getting these right while keeping them simple is one of the harder problems in identity. Privacy is the reason the [Privasys Wallet](/blog/privasys-wallet-sign-in-consent-and-who-knows-what) exists, and this release gives you firmer control in three places: removing an application, letting it spend, and sharing what it asks for.

## Removing an app cancels it, like cancelling a direct debit

Deleting a company's app from your phone does not stop the company from collecting a direct debit: for that, you cancel the mandate with your bank. Removing an application from the wallet used to be closer to deleting the app. It cleared the application from your phone, while privasys.id, our identity service, could still hold its sessions, its permissions and its requests to you.

Removing an application now cancels all of it at privasys.id: the open sessions (any browser you approved for it is signed out), any permission to spend, any requests it had waiting for you, and the link that lets it send you notifications. Each application knows you by its own pseudonym, and once that link is deleted, no record at privasys.id leads from the application's pseudonym back to you.

The wallet asks privasys.id to do this first, and takes the application off your phone only once privasys.id confirms it is done. If privasys.id cannot be reached, for example because your phone has no signal, the application stays in your wallet with a message saying the removal did not complete, so the button to try again is still there.

## A permission to spend works like a card authorisation, signed by you

Some services on our platform are paid for in credits, and an application can spend your credits only if you allow it, up to a monthly limit you set. This works much like authorising a card payment or signing a direct debit mandate: you agree to a payee and a limit, the payee collects against a reference, and your bank keeps the link between that reference and your account.

With this release the mandate carries your own signature. When you allow an application to spend, the wallet creates a random reference for the permission and signs the reference, the application and the limit with your key, inside your phone. The platform's ledger, which holds your credits, links the reference to your balance, in the same way that only your bank links a mandate reference to your account. The application and the services it pays see the reference alone, so their payment records cannot be traced to you. The signature is evidence that the permission came from you, rather than from privasys.id on its own, and it is made with a key specific to the identity you used, so it reveals nothing about your other identities.

## Sharing is all or nothing

Some applications ask for a verified detail, such as proof that you are over 18. The wallet produces that proof from your passport or identity card, checked once in our identity verification enclave. If you have not done that check yet, the wallet now takes you through it first and signs you in afterwards, so the application receives one complete sign-in rather than a sign-in now and the detail later.

The same rule applies to every sign-in. If a detail an application marks as required cannot be provided, the wallet shares nothing, tells you which detail was missing, and lets you start again by scanning the code. An application only ever receives a sign-in that carries everything it asked for.

## The new version is mandatory

These changes rely on the wallet and privasys.id working together, so we have made the new version mandatory. A wallet older than 1.4.38 shows an update screen, in the language you use the wallet in, that explains what the update brings and stays until the update is installed. Updating keeps your identities and your data.

## Open, and still improving

The wallet and privasys.id are open source, so every change described here can be read and checked in the code, and the applications you sign in to run in enclaves whose code the wallet verifies before you approve. Privacy in sign-in and permissions is ongoing work for us, and we will keep publishing each improvement as it ships.

*Privasys Wallet is available on the [App Store](https://apps.apple.com/app/privasys-wallet/id6761209489) and [Google Play](https://play.google.com/store/apps/details?id=org.privasys.wallet). Its source, and the source of privasys.id, is open under the AGPL-3.0 licence at [github.com/Privasys/identity-platform](https://github.com/Privasys/identity-platform).*
