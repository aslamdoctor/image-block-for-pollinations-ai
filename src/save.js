import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

import './editor.scss';

export default function Save() {
	return (
		<div { ...useBlockProps.save() }>
			<InnerBlocks.Content templateLock="all" />
		</div>
	);
}
