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
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { BRAND, styles } from './_brand'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your new GEM.IQ email address</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Img src={BRAND.logoUrl} alt="GEM.IQ" style={styles.logo} />
        </Section>
        <Section style={styles.card}>
          <div style={styles.mintAccent} />
          <Heading style={styles.h1}>Confirm your new email</Heading>
          <Text style={styles.text}>
            You asked to change the email on your GEM.IQ account from{' '}
            <Link href={`mailto:${oldEmail}`} style={styles.link}>
              {oldEmail}
            </Link>{' '}
            to{' '}
            <Link href={`mailto:${newEmail}`} style={styles.link}>
              {newEmail}
            </Link>
            .
          </Text>
          <Button style={styles.button} href={confirmationUrl}>
            Confirm email change
          </Button>
          <Hr style={styles.divider} />
          <Text style={{ ...styles.text, fontSize: '13px', margin: 0 }}>
            Didn't request this change? Sign in and secure your account
            immediately.
          </Text>
        </Section>
        <Text style={styles.footer}>
          <span style={styles.footerStrong}>GEM.IQ</span> · Global Edge Markets
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
