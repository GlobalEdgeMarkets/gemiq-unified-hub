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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your GEM.IQ password</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Img src={BRAND.logoUrl} alt="GEM.IQ" style={styles.logo} />
        </Section>
        <Section style={styles.card}>
          <div style={styles.mintAccent} />
          <Heading style={styles.h1}>Reset your password</Heading>
          <Text style={styles.text}>
            We received a request to reset the password for your GEM.IQ
            account. Choose a new one using the secure link below.
          </Text>
          <Button style={styles.button} href={confirmationUrl}>
            Reset password
          </Button>
          <Hr style={styles.divider} />
          <Text style={{ ...styles.text, fontSize: '13px', margin: 0 }}>
            If you didn't ask for a reset, you can safely ignore this email —
            your password won't change.
          </Text>
        </Section>
        <Text style={styles.footer}>
          <span style={styles.footerStrong}>GEM.IQ</span> · Global Edge Markets
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
