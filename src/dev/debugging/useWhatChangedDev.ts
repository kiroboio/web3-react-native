import { useWhatChanged } from '@simbathesailor/use-what-changed'

export const useWhatChangedDev =
  process.env.NODE_ENV !== 'development'
    ? () => ({})
    : (hookDescription: string, deps?: { [key: string]: unknown }) => {
        const depsArray: unknown[] = [hookDescription]
        let depsNames = 'hook description,'

        if (deps) {
          Object.keys(deps).forEach((key: string) => {
            depsArray.push(deps[key])
            depsNames += `${key},`
          })
        }

        useWhatChanged(depsArray, depsNames)
      }
