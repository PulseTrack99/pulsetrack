# Gabarits d'e-mails d'authentification

À coller dans Supabase → **Authentication → Emails → Templates**.

| Fichier | Gabarit Supabase | Objet à mettre dans *Subject heading* |
|---|---|---|
| `confirm-signup.html` | Confirm signup | `Confirmez votre inscription · Confirm your signup` |
| `reset-password.html` | Reset Password | `Réinitialisez votre mot de passe · Reset your password` |

## Pourquoi bilingue

Le reste du produit suit le cookie de langue : la vitrine, le dashboard
et les pages d'authentification s'affichent en français ou en anglais
selon le visiteur. Les gabarits Supabase, eux, ne connaissent qu'une
langue et n'acceptent aucun conditionnel — il n'existe aucun moyen d'y
lire ce cookie.

Donc chaque e-mail contient les deux versions, français d'abord, chacune
complète avec son propre bouton. Un anglophone ne devrait pas avoir à
cliquer un bouton français pour activer son compte.

Si un jour un marché l'emporte nettement, il suffira de supprimer le
bloc de l'autre langue : les deux sections sont indépendantes.

## Les autres gabarits ne servent pas

Supabase en propose six. L'application n'en déclenche que deux :
`signUp` et `resetPasswordForEmail` (voir `src/components/auth-forms.tsx`).

- **Magic Link** — aucun flux sans mot de passe dans l'app
- **Invite user** — les invitations d'équipe partent du code, par Resend
  (`src/lib/email.ts`), pas de Supabase
- **Change Email Address** — l'écran Compte affiche l'adresse sans
  permettre de la modifier
- **Reauthentication** — non utilisé

Les personnaliser serait du travail que personne ne verrait. Si l'un de
ces flux est ajouté un jour, le gabarit sera à écrire à ce moment-là.

## Contraintes de rédaction

Tables et styles en ligne uniquement : Outlook ignore flexbox, grid et
les feuilles de style. Aucune police distante, elles ne se chargent pas
dans une bonne moitié des clients. Le lien brut figure en bas, certains
clients d'entreprise supprimant les boutons.

## Vérifier après avoir collé

Demander une réinitialisation depuis `/forgot-password` avec sa propre
adresse. Le message doit arriver de `noreply@pulsetrack.eu`, afficher
les deux langues, et le bouton doit mener à `/reset-password`.
