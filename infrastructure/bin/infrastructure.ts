#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno del archivo .env en la raíz para CDK
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { InfrastructureStack } from '../lib/infrastructure.stack';

const app = new cdk.App();

new InfrastructureStack(app, 'TemplateCdkBaseStack', {
  description: 'AWS CDK Archetype Base Stack - Deploy template resources',
});
