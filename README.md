# Symfony 7 Blog Tutorial: Building a Blog with Advanced Image Management

This tutorial guides you through creating a simple blog application using **Symfony 7**, with a strong focus on managing images for user profiles and articles. We'll start with a Symfony skeleton project, install necessary bundles, design a database, create entities, and implement robust image management using **VichUploaderBundle**, **Validator**, and **LiipImagineBundle**. The image management section covers uploading, validating, storing, and displaying images in multiple sizes (thumbnails, article page, index page).

## Prerequisites
- PHP 8.2 or higher
- Composer
- MySQL or another database supported by Doctrine
- Basic knowledge of Symfony and PHP

## Step 1: Setting Up the Symfony 7 Skeleton Project

First, create a new Symfony 7 project using the skeleton template, which provides a minimal setup that we can build upon.

```bash
composer create-project symfony/skeleton blog
cd blog
```

### Installing Essential Bundles
We'll install bundles one by one, explaining their purpose:

1. **Doctrine ORM** `(symfony/orm-pack)`: Provides database integration and entity management.
   ```bash
   composer require symfony/orm-pack
   ```

2. **Maker Bundle** `(symfony/maker-bundle)`: Simplifies generating controllers, entities, and forms.
   ```bash
   composer require --dev symfony/maker-bundle
   ```

3. **Twig** `(symfony/twig-pack)`: Template engine for rendering views.
   ```bash
   composer require symfony/twig-pack
   ```

4. **Security** `(symfony/security-bundle)`: Handles user authentication and authorization.
   ```bash
   composer require symfony/security-bundle
   ```

5. **VichUploaderBundle** `(vich/uploader-bundle)`: Manages file uploads, particularly images, with integration for Doctrine entities.
   ```bash
   composer require vich/uploader-bundle
   ```

6. **Validator** `(symfony/validator)`: Validates form inputs, including image file constraints (.g., size, mime type).
   ```bash
   composer require symfony/validator
   ```

7. **LiipImagineBundle** `(liip/imagine-bundle)`: Processes images to create resized versions (e.g., thumbnails, article images).
   ```bash
   composer require liip/imagine-bundle
   ```

8. **Forms** : Provides form handling and rendering functionality.
   ```bash
   composer require form     
   ```

9. **TailwindBundle** `(symfonycasts/tailwind-bundle)`: Integrates Tailwind CSS into Symfony for modern, utility-first styling.
   ```bash
   composer require symfonycasts/tailwind-bundle
   ```

10. **Asset Component** `(symfony/asset)` : Manages asset URLs (e.g., images, CSS, JS) in templates and supports versioning and base path configuration.
    ```bash
    composer require symfony/asset
    ```

### Configure the Database
Edit `.env` to set your database connection:

```env
DATABASE_URL="mysql://user:password@127.0.0.1:3306/symfonyblog?serverVersion=8.0&charset=utf8mb4"
```

## Step 2: Database Design

We need a main entity: **Article** (with associated images). Here’s the database schema:

- **Article**:
  - `id`: Integer, primary key, auto-increment
  - `title`: Varchar(255)
  - `content`: Text
  - `image`: Varchar(255), nullable (stores article image filename)
  - `created_at`: Datetime

This schema supports articles with optional images.

## Step 3: Create SQL Database and Entities

### Create the Database
Run the following command to create the database:

```bash
php bin/console doctrine:database:create
or php bin/console d:d:c 
```

### Create Article Entity
Use the Maker Bundle to generate `Article` entity.

```bash
php bin/console make:entity Article
```
Add fields: `title` (string), `content` (text), `image_path` (string), `created_at` (datetime).

Edit `src/Entity/Article.php`:

```php
<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use App\Repository\ArticleRepository;
use Symfony\Component\HttpFoundation\File\File;
use Vich\UploaderBundle\Mapping\Annotation as Vich;

#[ORM\Entity(repositoryClass: ArticleRepository::class)]
#[ORM\Table(name: 'article')]
#[Vich\Uploadable]
class Article
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $content = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $image_path = null;

    #[Vich\UploadableField(mapping: 'article_images', fileNameProperty: 'image_path')]
    private ?File $imageFile = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $created_at = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $updatedAt = null;

    public function __construct()
    {
        $this->created_at = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;
        return $this;
    }

    public function getContent(): ?string
    {
        return $this->content;
    }

    public function setContent(string $content): static
    {
        $this->content = $content;
        return $this;
    }

    public function getImagePath(): ?string
    {
        return $this->image_path;
    }

    public function setImagePath(?string $image_path): static
    {
        $this->image_path = $image_path;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->created_at;
    }

    public function setCreatedAt(\DateTimeImmutable $created_at): static
    {
        $this->created_at = $created_at;
        return $this;
    }

    public function getImageFile(): ?File
    {
        return $this->imageFile;
    }

    public function setImageFile(?File $imageFile = null): void
    {
        $this->imageFile = $imageFile;
        
        if ($imageFile) {
            // It's required to update the updatedAt property when a new file is uploaded
            // This is needed for VichUploaderBundle to detect the change
            $this->updatedAt = new \DateTimeImmutable();
        }
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(?\DateTimeImmutable $updatedAt): static
    {
        $this->updatedAt = $updatedAt;
        return $this;
    }
}
```

### Update the Database Schema
Create and apply migrations:

```bash
php bin/console make:migration
php bin/console doctrine:migrations:migrate
```

## Step 4: Image Management with Forms

This is the core of the project, focusing on uploading, validating, storing, and displaying images in multiple sizes.

### Configure VichUploaderBundle
Edit `config/packages/vich_uploader.yaml`:

```yaml
vich_uploader:
    db_driver: orm
    mappings:
        article_images:
            uri_prefix: /uploads/article_images
            upload_destination: '%kernel.project_dir%/public/uploads/article_images'
            namer: Vich\UploaderBundle\Naming\UniqidNamer
```

- **Explanation**:
  - `uri_prefix`: Public URL path for accessing images.
  - `upload_destination`: Filesystem path where images are stored.
  - `namer`: Generates unique filenames to avoid conflicts.

Create the upload directory:

```bash
mkdir -p public/uploads/article_images
```

### Configure LiipImagineBundle
Edit `config/packages/liip_imagine.yaml`:

```yaml
liip_imagine:
    # Use GD, imagick, or gmagick (GD is default and sufficient for most cases)
    driver: "gd"

    # Configure resolvers for caching
    resolvers:
        default:
            web_path:
                web_root: "%kernel.project_dir%/public"
                cache_prefix: "media/cache"


    filter_sets:
        index_card:
            quality: 85
            filters:
                thumbnail:
                    size: [600, 400]
                    mode: inset
                strip: ~
        article_large:
            quality: 90
            filters:
                thumbnail:
                    size: [1200, 800]
                    mode: inset
                strip: ~  # Remove metadata to reduce file size

```

- **Explanation**:
  - `index_card`: 600x400px for article listings.
  - `article_large`: 1200x800px for full article views.
  - `mode: inset`: Preserves aspect ratio, fits within specified dimensions.

## Image Processing Filters Guide

This part provides a detailed explanation of common image processing filters, including their purpose, parameters, examples, and use cases. Each filter is part of a configuration for an image processing pipeline (e.g., ImageMagick, CMS, or custom tool). An additional useful filter is also included.

---

### 1. Scales Proportionally

**Filter**: `scale`

- **Purpose**: Resizes an image to specific dimensions while maintaining the aspect ratio. The image is scaled to fit within the specified dimensions without stretching.
- **Parameters**:
  - `dim`: `[width, height]` specifying target dimensions.
- **Behavior**: Scales the image so either width or height matches the target, adjusting the other dimension to preserve the aspect ratio. The output may not exactly match the specified dimensions but will fit within them.
- **Example**:
  ```yaml
  filters:
    scale:
      dim: [300, 200]
  ```
- **Scenario**: A 600x400 image (3:2 aspect ratio) is resized to 300x200 (exact match). For a 600x600 image, scaling to `[300, 200]` results in 200x200 (height constrained to 200, width adjusted for 1:1 aspect ratio).
- **Use Case**: Creating thumbnails for a gallery where images must fit within a 300x200 box without distortion.
- **Visual Example**:
  - Original: 600x400 → Scaled: 300x200.
  - Original: 600x600 → Scaled: 200x200.

---

### 2. Crop a Specific Region

**Filter**: `crop`

- **Purpose**: Extracts a rectangular region from the image, discarding the rest.
- **Parameters**:
  - `start`: `[x, y]` specifying the top-left corner of the crop region.
  - `size`: `[width, height]` specifying the dimensions of the crop region.
- **Behavior**: Cuts out the specified region. If the crop exceeds image boundaries, it may fail or pad the output (tool-dependent).
- **Example**:
  ```yaml
  filters:
    crop:
      start: [0, 0]
      size: [100, 100]
  ```
- **Scenario**: A 500x500 image is cropped to a 100x100 square from the top-left corner, resulting in a 100x100 image.
- **Use Case**: Isolating a specific part of an image, like a logo or a detected face.
- **Visual Example**:
  - Original: 500x500.
  - Crop `[0, 0], [100, 100]`: 100x100 top-left region.
- **Note**: Ensure the crop region fits within the image to avoid errors.

---

### 3. Rotate the Image

**Filter**: `rotate`

- **Purpose**: Rotates the image by a specified angle (in degrees).
- **Parameters**:
  - A value (e.g., `90`) indicating the rotation angle (clockwise).
- **Behavior**: Rotates the image around its center. The canvas may expand, and background areas may be filled (e.g., with transparency or a solid color).
- **Example**:
  ```yaml
  filters:
    rotate: 90
  ```
- **Scenario**: A 400x600 portrait image is rotated 90° clockwise, resulting in a 600x400 landscape image.
- **Use Case**: Correcting photo orientation or creating rotated versions for design.
- **Visual Example**:
  - Original: 400x600 portrait.
  - Rotated 90°: 600x400 landscape.
- **Note**: Non-90/180/270° rotations may require handling non-rectangular bounding boxes.

---

### 4. Removes Metadata

**Filter**: `strip`

- **Purpose**: Removes metadata (e.g., EXIF, ICC profiles) to reduce file size and enhance privacy.
- **Parameters**:
  - None (`~` in YAML indicates empty/default configuration).
- **Behavior**: Strips all metadata (e.g., camera details, GPS) while preserving visual content.
- **Example**:
  ```yaml
  filters:
    strip: ~
  ```
- **Scenario**: A 2MB JPEG with EXIF data (camera, GPS) is reduced to 1.8MB by removing metadata.
- **Use Case**: Preparing images for web upload to minimize file size and protect privacy.
- **Visual Example**:
  - Original: JPEG with EXIF (camera: Canon, GPS: 40.7128°N, 74.0060°W).
  - Stripped: Same image, no metadata.
- **Note**: Stripping metadata doesn't affect quality but may remove useful data (e.g., color profiles).

---

### 5. Set Image Interlacing for Better Loading on Web

**Filter**: `interlace`

- **Purpose**: Enables interlacing for progressive loading on web pages (low-resolution preview first, then full detail).
- **Parameters**:
  - `mode`: Interlacing method (e.g., `line` for JPEG/PNG, `plane` for PNG, `partition` for JPEG).
- **Behavior**: Reorders pixel data so browsers display a coarse version before full download, improving perceived loading speed.
- **Example**:
  ```yaml
  filters:
    interlace:
      mode: line
  ```
- **Scenario**: A 1920x1080 JPEG loads as a blurry preview first, refining over seconds.
- **Use Case**: Optimizing large images for websites to improve user experience on slow connections.
- **Visual Example**:
  - Non-interlaced: Loads top-to-bottom, incomplete during download.
  - Interlaced (`line`): Loads as low-res preview, gradually sharpening.
- **Note**: Interlacing may slightly increase file size for some formats (e.g., PNG).

---

### 6. Resize While Maintaining Proportions

**Filter**: `relative_resize`

- **Purpose**: Resizes the image by a scaling factor relative to its original size, preserving the aspect ratio.
- **Parameters**:
  - `scale`: A float (e.g., `0.5` for 50%, `2.0` for 200%).
- **Behavior**: Multiplies width and height by the scale factor.
- **Example**:
  ```yaml
  filters:
    relative_resize:
      scale: 0.5
  ```
- **Scenario**: A 1000x800 image is scaled by `0.5`, resulting in 500x400.
- **Use Case**: Generating smaller images for responsive web design or email attachments.
- **Visual Example**:
  - Original: 1000x800.
  - Scaled (`0.5`): 500x400.
- **Note**: Ideal for consistent scaling across multiple images.

---

### Additional Useful Filter: Convert Image Format

**Filter**: `convert`

- **Purpose**: Changes the image file format (e.g., JPEG to PNG, PNG to WebP).
- **Parameters**:
  - `format`: Target format (`jpeg`, `png`, `webp`, `gif`).
  - Optional: `quality` (e.g., `80` for JPEG/WebP compression).
- **Behavior**: Converts to the specified format, applying format-specific compression. Reduces file size, improves compatibility, or enables features like transparency.
- **Example**:
  ```yaml
  filters:
    convert:
      format: webp
      quality: 80
  ```
- **Scenario**: A 2MB PNG is converted to a 500KB WebP, maintaining quality and transparency.
- **Use Case**: Optimizing for modern websites (WebP offers better compression) or ensuring compatibility (e.g., JPEG for email).
- **Visual Example**:
  - Original: 1920x1080 PNG (2MB).
  - Converted: 1920x1080 WebP (500KB).
- **Why It's Useful**: WebP/AVIF reduce load times; JPEG ensures compatibility.
- **Note**: Ensure the target format supports features (e.g., JPEG lacks transparency).

---

### Example Pipeline

Chaining filters for complex transformations:

```yaml
filters:
  relative_resize:
    scale: 0.5
  crop:
    start: [50, 50]
    size: [200, 200]
  rotate: 90
  convert:
    format: webp
    quality: 80
  strip: ~
  interlace:
    mode: line
```

- **Input**: 1000x800 PNG (2MB).
- **Steps**:
  1. `relative_resize: 0.5` → 500x400.
  2. `crop: [50, 50], [200, 200]` → 200x200.
  3. `rotate: 90` → 200x200 (rotated).
  4. `convert: webp, quality: 80` → WebP format.
  5. `strip: ~` → Removes metadata.
  6. `interlace: line` → Enables progressive loading.
- **Output**: 200x200 WebP (~50KB), web-optimized.

---

### Notes

- **Order Matters**: Filter order affects results (e.g., `crop` before `resize`).
- **Tool Dependency**: Syntax/behavior varies by library (e.g., ImageMagick, GD). Check documentation.
- **Testing**: Test filters on sample images to verify output.

### Create Article Form
```bash
php bin/console make:form ArticleType
```

Edit `src/Form/ArticleType.php`:

```php
<?php

namespace App\Form;

use App\Entity\Article;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\File;
use Vich\UploaderBundle\Form\Type\VichImageType;

class ArticleType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('title', TextType::class, [
                'label' => 'Title',
                'attr' => ['placeholder' => 'Enter article title'],
            ])
            ->add('content', TextareaType::class, [
                'label' => 'Content',
                'attr' => ['placeholder' => 'Enter article content', 'rows' => 10],
            ])
            ->add('imageFile', VichImageType::class, [
                'label' => 'Image',
                'required' => false,
                'allow_delete' => true,
                'delete_label' => 'Delete image',
                'download_label' => 'Download image',
                'download_uri' => true,
                'image_uri' => true,
                'imagine_pattern' => 'index_card',
                'asset_helper' => true,
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Article::class,
        ]);
    }
}
```

- **Explanation**:
  - `VichImageType`: Handles file uploads, integrates with VichUploaderBundle.
  - `required: false`: Images are optional.
  - `allow_delete`: Allows removing the uploaded image.
  - Validation is handled by the `#[Assert\Image]` constraints in the entities.

### Create Controller and Views
#### Article Controller
```bash
php bin/console make:controller ArticleController
```

Edit `src/Controller/ArticleController.php`:

```php
<?php

namespace App\Controller;

use App\Entity\Article;
use App\Form\ArticleType;
use App\Repository\ArticleRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class ArticleController extends AbstractController
{
    #[Route('/', name: 'article_index')]
    public function index(ArticleRepository $articleRepository): Response
    {
        $articles = $articleRepository->findRecentArticles();
        return $this->render('article/index.html.twig', [
            'articles' => $articles,
        ]);
    }

    #[Route('/article/new', name: 'article_new', methods: ['GET'])]
    public function showNewForm(): Response
    {
        $article = new Article();
        $form = $this->createForm(ArticleType::class, $article);
        
        return $this->render('article/new.html.twig', [
            'form' => $form->createView(),
        ]);
    }
    
    #[Route('/article/new', name: 'article_create', methods: ['POST'])]
    public function createArticle(Request $request, EntityManagerInterface $entityManager): Response
    {
        $article = new Article();
        $form = $this->createForm(ArticleType::class, $article);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($article);
            $entityManager->flush();
            
            $this->addFlash('success', 'Article created successfully.');
            return $this->redirectToRoute('article_index');
        }
        
        // If form validation failed, render the form again with errors
        return $this->render('article/new.html.twig', [
            'form' => $form->createView(),
        ]);
    }

    #[Route('/article/{id}', name: 'article_show')]
    public function show(Article $article): Response
    {
        return $this->render('article/show.html.twig', [
            'article' => $article,
        ]);
    }
}
```

Create `templates/article/new.html.twig`:

```twig
{% extends 'base.html.twig' %}

{% block title %}Create New Article - Symfony Blog{% endblock %}

{% block body %}
	<section class="py-12 bg-gray-100">
		<div class="container mx-auto px-4">
			<h1 class="text-4xl font-bold text-gray-800 mb-8 text-center animate-fade-in">Create New Article</h1>
			<div class="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-8 transform transition-transform hover:shadow-xl">
				{{ form_start(form, {'attr': {'class': 'space-y-6', 'enctype': 'multipart/form-data', 'method': 'POST', 'id': 'article-form'}}) }}
				{{ form_row(form.title, {
                        'attr': {
                            'class': 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
                            'placeholder': 'Enter article title'
                        }
                    }) }}
				{{ form_row(form.content, {
                        'attr': {
                            'class': 'w-full p-3 border border-gray-300 rounded-lg h-40 resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
                            'placeholder': 'Write your article content here...'
                        }
                    }) }}
				{{ form_row(form.imageFile, {
                        'attr': {
                            'class': 'block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer'
                        }
                    }) }}
				<div class="flex justify-center space-x-4">
					<button type="submit" class="bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-500 transition-transform transform hover:scale-105">
						Create Article
					</button>
					<a href="{{ path('article_index') }}" class="px-6 py-3 text-blue-600 font-semibold hover:underline">
						Back to Articles
					</a>
				</div>
				{{ form_end(form)}}
			</div>
		</div>
	</section>
{% endblock %}
```

Create `templates/article/index.html.twig`:

```twig
{% extends 'base.html.twig' %}

{% block title %}Blog - Symfony Blog
{% endblock %}

{% block body %}
	<h1 class="text-3xl font-bold mb-8 text-center animate-fade-in">Blog Articles</h1>
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		{% for article in articles %}
			<article class="bg-white shadow-lg rounded-lg p-3 hover:shadow-xl transition-shadow">
				<a href="{{ path('article_show', {'id': article.id}) }}" class="cursor-pointer">
					{% if article.imagePath %}
						<img src="{{ vich_uploader_asset(article, 'imageFile')|imagine_filter('index_card') }}" alt="{{ article.title }}" class="w-full h-48 object-cover rounded-lg mb-4">
					{% else %}
						<div class="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
							<span class="text-gray-500">No Image</span>
						</div>
					{% endif %}
					<h2 class="text-xl font-semibold mb-2">
						<a href="{{ path('article_show', {'id': article.id}) }}" class="text-blue-600 hover:underline">{{ article.title }}</a>
					</h2>
					<p class="text-gray-600 mb-2">{{ article.content|slice(0, 100) ~ '...' }}</p>
					<div class="text-sm text-gray-500">
						<p>Posted on
							{{ article.createdAt|date('F j, Y') }}</p>
					</div>
					<a href="{{ path('article_show', {'id': article.id}) }}" class="text-blue-500 hover:underline">Read More →</a>
				</a>
			</article>
		{% else %}
			<p class="text-center col-span-full">No articles found.</p>
		{% endfor %}
	</div>
{% endblock %}

```

Create `templates/article/show.html.twig`:

```twig
{% extends 'base.html.twig' %}

{% block title %}{{ article.title }} - Symfony Blog{% endblock %}

{% block body %}
    <article class="bg-white shadow-lg rounded-lg p-8 max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold mb-6 text-gray-900">{{ article.title }}</h1>
        <div class="flex items-center text-gray-600 mb-6">
            <p>Posted on {{ article.createdAt|date('F j, Y') }}</p>
        </div>
        {% if article.imagePath %}
            <img src="{{ vich_uploader_asset(article, 'imageFile')|imagine_filter('article_large') }}" alt="{{ article.title }}" class="w-full h-96 object-cover rounded-lg mb-6">
        {% endif %}
        <div class="prose max-w-none">
            {{ article.content|raw }}
        </div>
    </article>
{% endblock %}
```

Create a base template `templates/base.html.twig`:

```twig
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{% block title %}Symfony Blog{% endblock %}</title>
    {% block stylesheets %}
        <link rel="stylesheet" href="{{ asset('styles/app.css') }}">
    {% endblock %}
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body class="font-sans antialiased bg-gray-100 text-gray-900">
    <header class="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div class="max-w-7xl mx-auto flex items-center justify-between py-4 px-6">
            <div class="text-2xl font-bold tracking-tight">
                <a href="{{ path('article_index') }}" class="hover:text-blue-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white">Symfony Blog</a>
            </div>
            <button id="menu-toggler" class="md:hidden focus:outline-none focus:ring-2 focus:ring-white" aria-label="Toggle navigation menu" aria-expanded="false">
                <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>
            <nav id="menu" class="hidden md:flex md:items-center md:space-x-6 absolute md:static top-full left-0 w-full md:w-auto p-4 md:p-0 bg-blue-600 md:bg-transparent transition-all duration-300">
                <a href="{{ path('article_new') }}" class="block md:inline-block py-2 px-4 rounded-full bg-blue-500 hover:bg-blue-400 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white">Add Article</a>
            </nav>
        </div>
    </header>

    <main class="max-w-7xl mx-auto mt-8 px-4">
        {% block body %}{% endblock %}
    </main>

    <footer class="bg-gray-900 text-gray-300 py-8 mt-12">
        <div class="max-w-7xl mx-auto px-4 text-center">
            <p>© {{ 'now'|date('Y') }} Symfony Blog. All rights reserved.</p>
            <p class="mt-2">
                Built with
                <a href="https://symfony.com" class="text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400">Symfony</a>
                &
                <a href="https://tailwindcss.com" class="text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400">Tailwind CSS</a>.
            </p>
        </div>
    </footer>

    {% block javascripts %}
        <script>
            const toggler = document.getElementById('menu-toggler');
            const menu = document.getElementById('menu');

            toggler.addEventListener('click', () => {
                menu.classList.toggle('hidden');
                const expanded = toggler.getAttribute('aria-expanded') === 'true';
                toggler.setAttribute('aria-expanded', !expanded);
            });
        </script>
    {% endblock %}
    {{ encore_entry_script_tags('app') }}
</body>
</html>

```

### Image Management Details
- **Uploading**: Handled by `VichImageType` in forms, which integrates with VichUploaderBundle to store files in `public/uploads/`.
- **Validation**: Symfony Validator’s `#[Assert\Image]` ensures only JPEG/PNG files under specified sizes (2MB for profiles, 5MB for articles) are accepted.
- **Storage**: Images are stored in `public/uploads/profile_images` and `public/uploads/article_images` with unique filenames generated by `UniqidNamer`.
- **Displaying Multiple Sizes**: LiipImagineBundle creates resized images on-the-fly using defined filter sets (`profile_thumbnail`, `article_index`, etc.). The `imagine_filter` Twig filter applies these transformations.
- **Performance**: LiipImagineBundle caches resized images to reduce server load. Ensure your server has write permissions for the cache directory (`var/cache`).

### Security Considerations
- Restrict upload directories to prevent execution of malicious files (e.g., add `.htaccess` for Apache).
- Validate file types and sizes strictly to prevent abuse.
- Sanitize filenames to avoid directory traversal attacks.

## Step 5: Testing the Application
1. Start the Symfony server:
   ```bash
   symfony server:start
   ```
2. Register a user (implement a registration form using `make:registration-form` if needed).
3. Edit the user profile at `/user/edit/{id}` to upload a profile image.
4. Create articles at `/article/new` to upload article images.
5. View articles at `/article/` (index) and `/article/{id}` (show) to see images in different sizes.

## Conclusion
This tutorial demonstrated how to build a Symfony 7 blog with robust image management. By using **VichUploaderBundle** for uploads, **Validator** for input validation, and **LiipImagineBundle** for image resizing, we created a scalable system for handling user profile and article images. The application supports multiple image sizes, ensuring optimal display for thumbnails, index pages, and article pages.