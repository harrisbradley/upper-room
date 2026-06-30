# Custom Rules for Upper Room Project

## Deployment Workflow
- Whenever changes are made to files in this workspace, ensure they are synchronized/deployed to the Raspberry Pi (`harrispi`) at `/home/admin/servers/upper`.
- The preferred synchronization method is pushing the branch/changes to `github.com` and running `git pull` remotely on `harrispi`, or copying the files using `scp` to `admin@harrispi` if faster/easier.
- Always run `pm2 reload upper` remotely on `harrispi` after deploying the updates to ensure the latest changes take effect immediately.
