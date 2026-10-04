import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  subject?: string
  heading?: string
  body?: string
  buttonLabel?: string
  buttonUrl?: string
  unsubscribeUrl?: string
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#172864' }
const container = { padding: '28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', margin: '0 0 12px', color: '#172864' }
const p = { fontSize: '15px', lineHeight: '22px', color: '#2C365B', margin: '0 0 16px' }
const btn = { backgroundColor: '#05CFAB', color: '#172864', padding: '12px 20px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }
const small = { fontSize: '12px', color: '#6b7280', marginTop: '28px' }

const Email = ({ heading = 'GEM.IQ', body = '', buttonLabel, buttonUrl, unsubscribeUrl }: Props) => (
  <Html>
    <Head />
    <Preview>{heading}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{heading}</Heading>
        {body.split(/\n{2,}/).map((para, i) => <Text key={i} style={p}>{para}</Text>)}
        {buttonLabel && buttonUrl && <Button href={buttonUrl} style={btn}>{buttonLabel}</Button>}
        {unsubscribeUrl && (
          <Text style={small}>
            You're receiving this because you took a GEM.IQ assessment. <Link href={unsubscribeUrl}>Unsubscribe</Link>
          </Text>
        )}
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: Email,
  subject: (d) => d.subject ?? 'Your GEM.IQ results',
  displayName: 'Follow-up after a result',
  previewData: {
    subject: 'What your GTMIQ score of 62 means',
    heading: 'Your next move after GTMIQ',
    body: 'Your GTMIQ score of 62 (Developing) means the foundations are there.',
    buttonLabel: 'Open my report',
    buttonUrl: 'https://gemiq.globaledgemarkets.com/report/example',
    unsubscribeUrl: 'https://gemiq.globaledgemarkets.com/unsubscribe',
  },
}
