'use client';
import React from 'react';
import { useForm } from '@payloadcms/ui';
export default function SyncSection() {
 const { submit } = useForm();
 return <div><button type="button" onClick={() => submit()}>Save</button><button type="button" disabled>Bill sync paused for this release</button></div>;
}
