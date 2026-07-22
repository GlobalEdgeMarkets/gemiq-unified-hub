import * as React from 'react'

import {
  Body,
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

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your GEM.IQ verification code</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Img src={BRAND.logoUrl} alt="GEM.IQ" style={styles.logo} />
        </Section>
        <Section style={styles.card}>
          <div style={styles.mintAccent} />
          <Heading style={styles.h1}>Verify it's you</Heading>
          <Text style={styles.text}>
            Enter this code in GEM.IQ to confirm the action. The code expires
            shortly.
          </Text>
          <div style={styles.code}>{token}</div>
          <Hr style={styles.divider} />
          <Text style={{ ...styles.text, fontSize: '13px', margin: 0 }}>
            Didn't request this code? You can safely ignore this email.
          </Text>
        </Section>
        <Text style={styles.footer}>
          <span style={styles.footerStrong}>GEM.IQ</span> · Global Edge Markets
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
