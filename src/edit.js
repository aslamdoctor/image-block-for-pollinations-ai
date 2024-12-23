/**
 * Retrieves the translation of text.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from "@wordpress/i18n";

/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import {
	useBlockProps,
	InnerBlocks,
	store as blockEditorStore,
} from "@wordpress/block-editor";
import { Button, TextareaControl, Spinner } from "@wordpress/components";
import { useState } from "@wordpress/element";

import { createBlock } from "@wordpress/blocks";
import { useDispatch, useSelect } from "@wordpress/data";

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import "./editor.scss";

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes, clientId }) {
	const [loading, setLoading] = useState(false);
	const [tempPromptText, setTempPromptText] = useState('');
	const [tempGeneratedImage, setTempGeneratedImage] = useState('');
	const [error, setError] = useState('');
	const maxLength = 475; // Max characters allowed by pollination.ai

	// Get block editor dispatch functions
	const { insertBlock } = useDispatch(blockEditorStore);

	// Get existing inner blocks
	const { innerBlocks } = useSelect(
		(select) => ({
			innerBlocks: select(blockEditorStore).getBlocks(clientId),
		}),
		[clientId],
	);

	const generateImage = async () => {
		setLoading(true);

		if (!tempPromptText) {
			setLoading(false);
			return;
		}

		try {
			const response = await fetch(
				`https://image.pollinations.ai/prompt/${encodeURIComponent(
					tempPromptText,
				)}?nologo=true`,
				{
					method: "GET",
				},
			);

			const blob = await response.blob();
			const imageUrl = URL.createObjectURL(blob);
			setTempGeneratedImage(imageUrl);
		} catch (error) {
			setError(`<strong>${__("Error generating image:", "ai-media-generator")}</strong><br/> ${error}`);
		} finally {
			setLoading(false);
		}
	};

	const handleChange = (value) => {
		if (value.length <= maxLength) {
			setTempPromptText(value);
		}
	};

	const resetForm = () => {
		setTempPromptText("");
		setTempGeneratedImage("");
		setError("");
		setLoading(false);
	};

	const saveImage = () => {
		setLoading(true);

		// Create a blob from the blob URL
		fetch(tempGeneratedImage)
			.then((response) => response.blob())
			.then((blob) => {
				// Create a FileReader to read the blob as base64
				const reader = new FileReader();
				reader.onloadend = function () {
					// Get base64 data (remove the data URL prefix)
					const base64data = reader.result.split(",")[1];

					wp.ajax.send("ai_media_generator_save_image", {
						data: {
							prompt_text: tempPromptText,
							image_data: base64data,
						},
						success: function (response) {
							setAttributes({
								generatedImageId: response.attachment_id,
								generatedImageURL: response.url,
								promptText: tempPromptText,
							});

							// Create and insert new image block
							const imageBlock = createBlock("core/image", {
								id: response.attachment_id,
								sizeSlug: "large",
								url: response.url,
							});

							insertBlock(imageBlock, innerBlocks.length, clientId);

							// clear form
							setLoading(false);
							resetForm();
						},
						error: function (error) {
							setError(`<strong>${__("Error saving image:", "ai-media-generator")}</strong><br/> ${error}`);
						},
						finally: function () {
							setLoading(false);
						},
					});
				};
				reader.readAsDataURL(blob);
			});
	};

	return (
		<div {...useBlockProps()}>
			{ !innerBlocks.length && (
				<div class="form-container">

					<TextareaControl
						rows={3}
						label={__("Prompt Text", "ai-media-generator")}
						value={tempPromptText || ""}
						help={`${__("Characters left:", "ai-media-generator")} ${maxLength - tempPromptText.length}`}
						disabled={loading ? true : false}
						onChange={(value) => {
							handleChange(value);
						}}
					></TextareaControl>

					{!tempGeneratedImage && (
						<>
							<Button
								className="is-primary"
								disabled={loading ? true : false}
								onClick={() => generateImage()}
							>
								{loading ? __("Loading...", "ai-media-generator") : __("Generate Image", "ai-media-generator")}
							</Button>
							{loading && <Spinner />}
						</>
					)}

					{tempGeneratedImage !== "" && (
						<div className="buttons-row">
							<Button
								className="is-primary"
								onClick={() => {
									saveImage();
								}}
							>
								{ __("Save and insert", "ai-media-generator") }
							</Button>

							<Button
								className="is-secondary"
								onClick={() => {
									resetForm();
								}}
							>
								{ __("Cancel", "ai-media-generator") }
							</Button>
						</div>
					)}

					{error && (
						<div
							className="has-error"
							dangerouslySetInnerHTML={{ __html: error }}
						></div>
					)}

					{tempGeneratedImage !== "" && (
						<img
							src={tempGeneratedImage}
							width="100%"
							height="auto"
							alt=""
							className="generated-image"
						/>
					)}
				</div>
			)}

			<InnerBlocks allowedBlocks={["core/image"]} renderAppender={false} />
		</div>
	);
}
