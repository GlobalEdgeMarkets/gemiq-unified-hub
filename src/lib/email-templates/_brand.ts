// GEM.IQ brand tokens for email templates.
// Body background stays #ffffff per Lovable email rules; brand accents live inside.

export const BRAND = {
  siteName: 'GEM.IQ',
  siteUrl: 'https://gemiq.globaledgemarkets.com',
  logoUrl:
    'https://gemiq.globaledgemarkets.com/__l5e/assets-v1/586122f2-188f-4fa4-a311-bcbe75e39499/gem-logo-standard.png',
  colors: {
    navy: '#172864',
    navySoft: '#2C365B',
    mint: '#05CFAB',
    ink: '#0F172A',
    body: '#475569',
    muted: '#94A3B8',
    surface: '#F8FAFC',
    border: '#E2E8F0',
  },
  fonts: {
    heading:
      "'League Spartan', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    body: "'Didact Gothic', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    mono: "'JetBrains Mono', 'Courier New', monospace",
  },
} as const;

export const styles = {
  main: {
    backgroundColor: '#ffffff',
    fontFamily: BRAND.fonts.body,
    margin: 0,
    padding: '32px 0',
  },
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    padding: '0',
    backgroundColor: '#ffffff',
  },
  header: {
    padding: '8px 32px 24px',
    borderBottom: `1px solid ${BRAND.colors.border}`,
  },
  logo: {
    height: '32px',
    width: 'auto',
    display: 'block',
  },
  card: {
    padding: '32px',
  },
  h1: {
    fontFamily: BRAND.fonts.heading,
    fontSize: '28px',
    fontWeight: 700 as const,
    letterSpacing: '-0.01em',
    color: BRAND.colors.navy,
    margin: '0 0 16px',
    lineHeight: 1.15,
  },
  text: {
    fontFamily: BRAND.fonts.body,
    fontSize: '15px',
    lineHeight: 1.6,
    color: BRAND.colors.body,
    margin: '0 0 20px',
  },
  button: {
    display: 'inline-block',
    backgroundColor: BRAND.colors.navy,
    color: '#ffffff',
    fontFamily: BRAND.fonts.heading,
    fontSize: '14px',
    fontWeight: 700 as const,
    letterSpacing: '0.02em',
    textTransform: 'uppercase' as const,
    borderRadius: '10px',
    padding: '14px 26px',
    textDecoration: 'none',
    borderTop: `2px solid ${BRAND.colors.mint}`,
  },
  mintAccent: {
    display: 'inline-block',
    width: '32px',
    height: '3px',
    backgroundColor: BRAND.colors.mint,
    borderRadius: '2px',
    margin: '0 0 20px',
  },
  code: {
    display: 'inline-block',
    fontFamily: BRAND.fonts.mono,
    fontSize: '28px',
    fontWeight: 700 as const,
    letterSpacing: '0.35em',
    color: BRAND.colors.navy,
    backgroundColor: BRAND.colors.surface,
    border: `1px solid ${BRAND.colors.border}`,
    borderRadius: '10px',
    padding: '16px 24px',
    margin: '8px 0 24px',
  },
  link: {
    color: BRAND.colors.navy,
    textDecoration: 'underline',
    textDecorationColor: BRAND.colors.mint,
  },
  divider: {
    border: 'none',
    borderTop: `1px solid ${BRAND.colors.border}`,
    margin: '28px 0',
  },
  footer: {
    fontFamily: BRAND.fonts.body,
    fontSize: '12px',
    lineHeight: 1.5,
    color: BRAND.colors.muted,
    padding: '0 32px 24px',
    margin: 0,
  },
  footerStrong: {
    color: BRAND.colors.navySoft,
    fontWeight: 600 as const,
  },
};
