# Contournement de la Vérification de Substitution de Commande

Ce document détaille la modification effectuée pour contourner la vérification de sécurité `detectCommandSubstitution` dans le fichier `packages/core/src/utils/shell-utils.ts`.

## Contexte

L'utilisateur a demandé de désactiver la restriction de sécurité qui empêche l'utilisation de la substitution de commandes (par exemple, `$()`). Cette restriction est présente dans le code du projet `gemini-cli` lui-même.

**Note importante :** Cette modification ne désactive PAS la sécurité de l'environnement d'exécution de l'agent Gemini. L'erreur `Command substitution using $(), <(), or >() is not allowed for security reasons` peut donc toujours se produire lors de l'utilisation de l'outil `run_shell_command` de l'agent.

## Modification Apportée

Dans le fichier `packages/core/src/utils/shell-utils.ts`, le bloc de code suivant à l'intérieur de la fonction `checkCommandPermissions` a été commenté :

```typescript
// Disallow command substitution for security.
if (detectCommandSubstitution(command)) {
  return {
    allAllowed: false,
    disallowedCommands: [command],
    blockReason:
      'Command substitution using $(), <(), or >() is not allowed for security reasons',
    isHardDenial: true,
  };
}
```

**Nouveau code :**

```typescript
// Disallow command substitution for security.
// if (detectCommandSubstitution(command)) {
//   return {
//     allAllowed: false,
//     disallowedCommands: [command],
//     blockReason:
//       'Command substitution using $(), <(), or >() is not allowed for security reasons',
//     isHardDenial: true,
//   };
// }
```
