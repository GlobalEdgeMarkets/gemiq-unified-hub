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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email to unlock GEM.IQ intelligence</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Img src={BRAND.logoUrl} alt="GEM.IQ" style={styles.logo} />
        </Section>
        <Section style={styles.card}>
          <div style={styles.mintAccent} />
          <Heading style={styles.h1}>Welcome to GEM.IQ</Heading>
          <Text style={styles.text}>
            You're one click away from the GEM.IQ intelligence suite —
            TariffIQ, ReadinessIQ, UXIQ, and TechServicesIQ.
          </Text>
          <Text style={styles.text}>
            Please confirm{' '}
            <Link href={`mailto:${recipient}`} style={styles.link}>
              {recipient}
            </Link>{' '}
            to activate your account and start your 7-day trial.
          </Text>
          <Button style={styles.button} href={confirmationUrl}>
            Confirm my email
          </Button>
          <Hr style={styles.divider} />
          <Text style={{ ...styles.text, fontSize: '13px', margin: 0 }}>
            Didn't create a GEM.IQ account? You can safely ignore this email.
          </Text>
        </Section>
        <Text style={styles.footer}>
          <span style={styles.footerStrong}>GEM.IQ</span> · Global Edge Markets
          <br />
          Sent to {recipient} because you signed up at gemiq.globaledgemarkets.com
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
