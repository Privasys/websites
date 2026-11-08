---
title: "Privasys ID: Sign In Through Your Own Microsoft Tenant, in Your Own Design"
author: "B Foing"
date: "2026-11-07"
---

An organisation that builds an application for its staff usually has two requirements for sign-in. Staff use the work account they already have, which for most organisations is a Microsoft account. And the sign-in page looks like the organisation's other services, which for a public body means following its design system to the letter.

Privasys ID, our identity provider, meets both on its shared service. An organisation can send its staff through its own Microsoft registration, and draw the sign-in page with its own components. The credentials and the sign-in flows stay with privasys.id, and the organisation runs no identity system of its own.

## Your own Microsoft registration

Microsoft signs a person in to an application only if that application is registered in a Microsoft Entra directory, called a tenant. The registration decides the name on Microsoft's consent screen and which accounts may sign in.

Until now, every application on Privasys signed in through our registration. That works on day one, but staff see a consent screen with our name rather than their employer's, and any Microsoft account, from any organisation, is accepted.

An organisation can now use its own registration instead. It creates one in its tenant, and we link it to the application's sign-in:

```bash
privasys oauth-clients federation set <client> microsoft \
  --tenant <tenant id> --client-id <application id> \
  --display-name "Contoso Staff" --certificate
```

A single-tenant registration admits the organisation's own staff only. Microsoft refuses accounts from other organisations, and those people can still sign in with the Privasys Wallet. A multi-tenant registration admits any Microsoft account. A person keeps the same identity on privasys.id whichever registration they came through.

## No secret changes hands

Microsoft only completes a sign-in for the registered application, so privasys.id has to prove it acts for the registration. The common way is a client secret: a password generated in the Entra admin centre and sent to whoever runs the sign-in.

We use a certificate instead. The command above generates a key pair at privasys.id and prints a certificate. The organisation uploads the certificate to its registration. Every token request is then signed with the private key, which never leaves privasys.id. Nothing secret is copied, emailed or stored by the organisation.

The certificate lasts two years. To renew it, `--rotate` prints a new one while the old key keeps working. The organisation uploads it beside the old one, and the new key takes over only when the organisation confirms. Sign-in never stops.

The steps in Entra are in the [Entra sign-in tutorial](https://docs.privasys.org/tutorials/entra-sign-in).

## Personal details: our consent flow, and what changes with Microsoft

Most applications on Privasys ask for no personal details at all. They receive one identifier for the person, specific to that application, and nothing else: no name, no email, nothing that links the person across applications.

An application that does need details declares them when it registers, for example a name and an email address. The person then shares them through our consent flow. The Privasys Wallet shows what the application asks for, the person approves, and the details travel on the token issued at that sign-in. privasys.id stores none of them.

A sign-in through Microsoft, with the platform's registration or the organisation's own, keeps the same rules: the application still receives only what it declared, and privasys.id still stores nothing. Three things change, because the details now come from Microsoft rather than from the wallet.

**Consent happens on Microsoft's side.** The person agrees to share their profile on Microsoft's consent screen, or their organisation's administrator agreed for all its staff when setting up the registration. The wallet's consent screen does not appear in this flow.

**Microsoft's email address is not always proved.** The wallet only holds an address the person proved, by entering a code we sent to it. Microsoft returns the address stored in the person's directory, and an administrator of any tenant can set that to any value. So we pass an address on only when something proves it:

- **The organisation's own registration**, limited to its own tenant: the organisation answers for its staff's addresses.
- **Microsoft's `xms_edov` claim**, which states that the person's tenant has verified the address's domain.

A personal Microsoft account, such as an outlook.com address, has neither: no organisation answers for it, and Microsoft does not include the claim. We do not pass its address to the application. An application that needs an email address for that person collects and verifies it itself.

**The details arrive once.** Microsoft gives the profile at sign-in, privasys.id passes it on and keeps nothing, and a token renewed later carries the identifier alone. The application stores the details the first time it receives them. This is the same rule as for details shared from the wallet.

For an application running in an enclave, our runtime reads the name and the proved email from the sign-in token and passes them to the application as two headers, `X-Privasys-Name` and `X-Privasys-Email`, so the application does not have to read the token itself. Any other detail the application declared stays on the token.

## The sign-in page in your own design

The sign-in runs in a frame on privasys.id, so the page around it never sees a credential or a key. Until now, the page could only restyle that frame with a font, colours and a corner radius.

The auth SDK now has a **headless** mode. The frame stays invisible. It tells the page which options to offer, such as the organisation's own registration, Google or the Privasys Wallet. The page draws the buttons with its own components and starts the one the person picks. The frame then reports progress for the page to show: a notification sent to the phone, a QR code to scan, or an error.

```ts
const frame = new AuthFrame({
  clientId: 'my-app',
  headless: {
    onOptions: (options, gate) => drawButtons(options, (choice) => gate.start(choice)),
    onState: (s) => showProgress(s),
  },
});
const { accessToken } = await frame.connect();
```

The sensitive steps stay in the frame. A Microsoft or Google sign-in opens its window on privasys.id. The wallet goes through our relay. The frame starts only an option it offered. The page receives the same token as with the standard frame.

Passkeys are the one exception. A passkey ceremony needs the click to happen inside the frame, so an application that offers passkeys keeps the standard frame.

The SDK includes a [complete headless page](https://github.com/Privasys/identity-platform/tree/main/sdk/examples/headless) in the style of the GOV.UK Design System, which has strict rules on buttons, focus and error messages.

## One shared service

Each of these is a setting on the shared identity provider. An organisation gets its own Microsoft registration, its own sign-in design and a proved profile for its staff, with no identity system to run.

*Privasys ID and the auth SDK are open source under the AGPL-3.0 licence at [github.com/Privasys/identity-platform](https://github.com/Privasys/identity-platform). The [auth SDK documentation](https://docs.privasys.org/solutions/privasys-id/auth-sdk) covers the headless mode and the profile headers.*
