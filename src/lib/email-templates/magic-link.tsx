import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { BRAND, styles } from './_brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your one-tap sign-in link for GEM.IQ</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Img src={BRAND.logoUrl} alt="GEM.IQ" style={styles.logo} />
        </Section>
        <Section style={styles.card}>
          <div style={styles.mintAccent} />
          <Heading style={styles.h1}>Your sign-in link</Heading>
          <Text style={styles.text}>
            Tap the button below to sign in to GEM.IQ. For your security this
            link expires shortly and can only be used once.
          </Text>
          <Button style={styles.button} href={confirmationUrl}>
            Sign in to GEM.IQ
          </Button>
          <Hr style={styles.divider} />
          <Text style={{ ...styles.text, fontSize: '13px', margin: 0 }}>
            Didn't request this link? You can safely ignore this email — your
            account stays secure.
          </Text>
        </Section>
        <Text style={styles.footer}>
          <span style={styles.footerStrong}>GEM.IQ</span> · Global Edge Markets
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
