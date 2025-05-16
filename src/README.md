# Image Block for Pollinations.ai

## Development Setup

### Prerequisites
- Node.js and npm installed on your system
- WordPress

### Installation
1. Clone the repository
2. Navigate to the plugin directory
3. Run `nvm use` to switch to the right node version
4. Run `npm install` to install dependencies

### Available Scripts

The following npm scripts are available for development:

- `npm run start` - Watches for file changes and automatically recompiles assets
- `npm run build` - Compiles assets for production with optimizations

### Usage
1. For development, run `npm run start` to automatically compile assets when files change
2. For production builds, run `npm run build` to generate optimized assets


## Steps to deploy the plugin

**Build plugin files**

```bash
npm run build
```

Update version number in:
* Main plugin file header
* readme.txt
* Any constants in your code

Update changelog in `readme.txt`

**Commit changes:**

```bash
git add .
git commit -m "Prepare release v1.2.3"
git tag 1.2.3  # Replace with your current tag
git push origin 1.2.3  # Replace with your current tag
```

Also do git push so that the main repo will be up to date. **This will not run the deploy workflow, so don’t worry**

```bash
git push
```

## To manually run the deploy

If the re-run option doesn't work, you can delete and re-push the same tag:

```bash
# Delete the tag locally
git tag -d 1.2.3  # Replace with your current tag

# Delete the tag on GitHub
git push origin :refs/tags/1.2.3  # Replace with your current tag

# Create the tag again
git tag 1.2.3  # Replace with your current tag

# Push the tag again
git push origin 1.2.3  # Replace with your current tag
```
