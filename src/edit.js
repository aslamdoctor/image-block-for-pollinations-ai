import { __ } from '@wordpress/i18n';

import {
	useBlockProps,
	InnerBlocks,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { Button, TextareaControl, Spinner } from '@wordpress/components';
import { useState } from '@wordpress/element';

import { createBlock } from '@wordpress/blocks';
import { useDispatch, useSelect } from '@wordpress/data';

import './editor.scss';

export default function Edit( { setAttributes, clientId } ) {
	const [ loading, setLoading ] = useState( false );
	const [ tempPromptText, setTempPromptText ] = useState( '' );
	const [ tempGeneratedImage, setTempGeneratedImage ] = useState( '' );
	const [ error, setError ] = useState( '' );
	const maxLength = 475; // Max characters allowed by pollination.ai

	// Get block editor dispatch functions
	const { insertBlock } = useDispatch( blockEditorStore );

	// Get existing inner blocks
	const { innerBlocks } = useSelect(
		( select ) => ( {
			innerBlocks: select( blockEditorStore ).getBlocks( clientId ),
		} ),
		[ clientId ]
	);

	// Generate image
	const generateImage = async () => {
		setLoading( true );

		if ( ! tempPromptText ) {
			setLoading( false );
			return;
		}

		try {
			const response = await fetch(
				`https://image.pollinations.ai/prompt/${ encodeURIComponent(
					tempPromptText
				) }?nologo=true`,
				{
					method: 'GET',
				}
			);

			const blob = await response.blob();
			const imageUrl = URL.createObjectURL( blob );
			setTempGeneratedImage( imageUrl );
		} catch ( errorMsg ) {
			setError(
				`<strong>${ __(
					'Error generating image:',
					'pollination-ai-image-block'
				) }</strong><br/> ${ errorMsg }`
			);
		} finally {
			setLoading( false );
		}
	};

	// Handle prompt text change
	const handleChange = ( value ) => {
		if ( value.length <= maxLength ) {
			setTempPromptText( value );
		}
	};

	// Reset form
	const resetForm = () => {
		setTempPromptText( '' );
		setTempGeneratedImage( '' );
		setError( '' );
		setLoading( false );
	};

	// Save image
	const saveImage = () => {
		setLoading( true );

		// Create a blob from the blob URL
		fetch( tempGeneratedImage )
			.then( ( response ) => response.blob() )
			.then( ( blob ) => {
				// Create a FileReader to read the blob as base64
				const reader = new window.FileReader();
				reader.onloadend = function () {
					// Get base64 data (remove the data URL prefix)
					const base64data = reader.result.split( ',' )[ 1 ];

					wp.ajax.send( 'pollination_ai_image_block_save_image', {
						data: {
							prompt_text: tempPromptText,
							image_data: base64data,
							nonce: aiMediaGenerator.nonce
						},
						success( response ) {
							setAttributes( {
								generatedImageId: response.attachment_id,
								generatedImageURL: response.url,
								promptText: tempPromptText,
							} );

							// Create and insert new image block
							const imageBlock = createBlock( 'core/image', {
								id: response.attachment_id,
								sizeSlug: 'large',
								url: response.url,
							} );

							insertBlock(
								imageBlock,
								innerBlocks.length,
								clientId
							);

							// clear form
							setLoading( false );
							resetForm();
						},
						error( errorMsg ) {
							setError(
								`<strong>${ __(
									'Error saving image:',
									'pollination-ai-image-block'
								) }</strong><br/> ${ errorMsg }`
							);
						},
						finally() {
							setLoading( false );
						},
					} );
				};
				reader.readAsDataURL( blob );
			} );
	};

	return (
		<div { ...useBlockProps() }>
			{ ! innerBlocks.length && (
				<div className="form-container">
					<TextareaControl
						rows={ 3 }
						label={ __( 'Prompt Text', 'pollination-ai-image-block' ) }
						value={ tempPromptText || '' }
						help={ `${ __(
							'Characters left:',
							'pollination-ai-image-block'
						) } ${ maxLength - tempPromptText.length }` }
						disabled={ loading ? true : false }
						onChange={ ( value ) => {
							handleChange( value );
						} }
					></TextareaControl>

					{ ! tempGeneratedImage && (
						<>
							<Button
								className="is-primary"
								disabled={ loading ? true : false }
								onClick={ () => generateImage() }
							>
								{ loading
									? __( 'Loading…', 'pollination-ai-image-block' )
									: __(
											'Generate Image',
											'pollination-ai-image-block'
									  ) }
							</Button>
							{ loading && <Spinner /> }
						</>
					) }

					{ tempGeneratedImage !== '' && (
						<div className="buttons-row">
							<Button
								className="is-primary"
								onClick={ () => {
									saveImage();
								} }
							>
								{ __(
									'Save and insert',
									'pollination-ai-image-block'
								) }
							</Button>

							<Button
								className="is-secondary"
								onClick={ () => {
									resetForm();
								} }
							>
								{ __( 'Cancel', 'pollination-ai-image-block' ) }
							</Button>
						</div>
					) }

					{ error && (
						<div
							className="has-error"
							dangerouslySetInnerHTML={ { __html: error } }
						></div>
					) }

					{ tempGeneratedImage !== '' && (
						<img
							src={ tempGeneratedImage }
							width="100%"
							height="auto"
							alt=""
							className="generated-image"
						/>
					) }
				</div>
			) }

			<InnerBlocks
				allowedBlocks={ [ 'core/image' ] }
				renderAppender={ false }
			/>
		</div>
	);
}
