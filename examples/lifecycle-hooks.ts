import 'dotenv/config'
import { 
  SearchModel, 
  StringType, 
  DateType, 
  NumberType,
  StringArrayType,
  SaveEvent,
  DeleteEvent
} from '../src'

// Example model with lifecycle hooks
class BlogPost extends SearchModel<BlogPost> {
  static readonly indexName = 'example_blog_posts'
  
  @StringType({ required: true })
  title!: string
  
  @StringType({ required: true })
  content!: string
  
  @StringType()
  slug!: string
  
  @StringArrayType()
  tags!: string[]
  
  @NumberType({ default: () => 0 })
  viewCount!: number
  
  @DateType()
  publishedAt?: Date
  
  @StringType()
  status!: 'draft' | 'published' | 'archived'
  
  // Lifecycle hooks
  protected async beforeSave(event: SaveEvent): Promise<boolean> {
    console.log('🔄 beforeSave hook triggered')
    console.log('  Changed fields:', event.updated)
    
    // Auto-generate slug from title if not set
    if (!this.slug && this.title) {
      this.slug = this.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      console.log('  Generated slug:', this.slug)
    }
    
    // Set publishedAt when status changes to published
    if (event.updated.includes('status') && this.status === 'published' && !this.publishedAt) {
      this.publishedAt = new Date()
      console.log('  Set publishedAt:', this.publishedAt)
    }
    
    // Normalize tags
    if (this.tags) {
      this.tags = this.tags.map(tag => tag.toLowerCase().trim()).filter(tag => tag.length > 0)
      console.log('  Normalized tags:', this.tags)
    }

    return true
  }

  protected async afterSave(event: SaveEvent): Promise<void> {
    console.log('✅ afterSave hook triggered')
    console.log('  Document saved with ID:', this.id)
    
    if (event.updated.includes('status') && this.status === 'published') {
      console.log('  📢 Post published! Would trigger notifications here...')
      // In a real app, you might:
      // - Send email notifications to subscribers
      // - Update cache
      // - Trigger webhooks
      // - Update search index
    }
    
    if (event.updated.includes('tags')) {
      console.log('  🏷️ Tags updated! Would update tag cloud here...')
      // In a real app, you might update tag statistics
    }
  }
  
  protected async beforeDelete(event: DeleteEvent): Promise<void> {
    console.log('⚠️ beforeDelete hook triggered')
    console.log('  About to delete post:', this.title)
    
    // In a real app, you might:
    // - Check if user has permission to delete
    // - Archive the post instead of hard delete
    // - Clean up related data (comments, likes, etc.)
    
    if (this.status === 'published') {
      console.log('  Warning: Deleting a published post!')
    }
  }
  
  protected async afterDelete(event: DeleteEvent): Promise<void> {
    console.log('🗑️ afterDelete hook triggered')
    console.log('  Post deleted:', this.title)
    
    // In a real app, you might:
    // - Log the deletion for audit
    // - Update statistics
    // - Clear caches
    // - Send notifications
  }
}

async function demonstrateLifecycleHooks() {
  try {
    console.log('=== Lifecycle Hooks Demonstration ===\n')
    
    // Create index
    await BlogPost.createIndex()
    
    console.log('1. Creating a new blog post (triggers beforeSave & afterSave)...\n')
    const post = await BlogPost.create({
      title: 'Understanding TypeScript Decorators!',
      content: 'TypeScript decorators are a powerful feature that allows you to add metadata and modify classes, properties, methods, and parameters...',
      tags: ['  TypeScript ', 'DECORATORS', 'programming  '],
      status: 'draft'
    })
    
    console.log('\n2. Current post state:')
    console.log(JSON.stringify({
      title: post.title,
      slug: post.slug,
      status: post.status,
      publishedAt: post.publishedAt,
      tags: post.tags
    }, null, 2))
    
    console.log('\n3. Publishing the post (triggers beforeSave & afterSave)...\n')
    post.status = 'published'
    post.tags.push('Tutorial')
    await post.save()
    
    console.log('\n4. Post after publishing:')
    console.log(JSON.stringify({
      title: post.title,
      slug: post.slug,
      status: post.status,
      publishedAt: post.publishedAt,
      tags: post.tags
    }, null, 2))
    
    console.log('\n5. Updating view count (triggers beforeSave & afterSave)...\n')
    post.viewCount = 100
    await post.save()
    
    console.log('\n6. Archiving the post...\n')
    post.status = 'archived'
    await post.save()
    
    console.log('\n7. Deleting the post (triggers beforeDelete & afterDelete)...\n')
    await post.delete()
    
    console.log('\n✅ Lifecycle hooks demonstration completed!')
    
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

// Run the demonstration
demonstrateLifecycleHooks()