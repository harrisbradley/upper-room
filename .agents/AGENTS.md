# Custom Rules for Upper Room Project

## Deployment Workflow
- Whenever changes are made to files in this workspace, ensure they are synchronized/deployed to the homelab/server environment at `/home/admin/servers/upper`.
- The preferred synchronization method is pushing the branch/changes to `github.com` and running `git pull` remotely on the target server, or copying the files using `scp` to the deployment host.
- Always run `pm2 reload upper` remotely on the target server after deploying the updates to ensure the latest changes take effect immediately.
