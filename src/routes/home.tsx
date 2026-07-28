import { useTranslations } from 'use-intl'

export function HomeRoute() {
  const t = useTranslations('app')

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-2 p-8">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="text-foreground-muted">{t('tagline')}</p>
    </main>
  )
}
