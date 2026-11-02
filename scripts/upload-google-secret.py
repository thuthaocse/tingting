#!/usr/bin/env python3
"""Load a Google Web client download into the Terraform-managed OAuth secret."""

import argparse
import json
import subprocess
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('client_file', type=Path)
    parser.add_argument('--secret-arn')
    parser.add_argument('--profile', default='thao-dev')
    parser.add_argument('--region', default='ap-southeast-2')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    credentials = load_credentials(args.client_file)
    if args.check:
        print('Valid Google Web application client; required credentials are present.')
        return
    if not args.secret_arn:
        parser.error('--secret-arn is required unless --check is used')
    upload_credentials(args, credentials)


def load_credentials(path):
    try:
        client = json.loads(path.read_text()).get('web', {})
    except (OSError, ValueError):
        raise SystemExit('Cannot read a valid Google client JSON file.') from None
    if not isinstance(client, dict):
        raise SystemExit('A Google Web application client is required.')
    fields = {'GOOGLE_CLIENT_ID': 'client_id', 'GOOGLE_CLIENT_SECRET': 'client_secret'}
    if not all(isinstance(client.get(key), str) and client[key].strip() for key in fields.values()):
        raise SystemExit('The Web client must contain client_id and client_secret.')
    return {name: client[key] for name, key in fields.items()}


def upload_credentials(args, credentials):
    command = [
        'aws', '--profile', args.profile, '--region', args.region,
        'secretsmanager', 'put-secret-value', '--secret-id', args.secret_arn,
        '--secret-string', 'file:///dev/stdin', '--no-cli-pager',
    ]
    try:
        subprocess.run(command, input=json.dumps(credentials), text=True,
                       stdout=subprocess.DEVNULL, check=True)
    except (OSError, subprocess.CalledProcessError):
        raise SystemExit('Secret upload failed. Check the AWS session, ARN and permissions.') from None
    print('Google credentials uploaded. Enable google_oauth_enabled in Terraform.')


if __name__ == '__main__':
    main()
