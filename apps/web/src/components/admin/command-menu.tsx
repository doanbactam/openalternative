"use client"

import type { Alternative, Category, License, Tool } from "@openalternative/db/client"
import { LoaderIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { testSocialPosts } from "~/actions/misc"
import { searchItems } from "~/actions/search"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/admin/ui/command"
import { useDebouncedState } from "~/hooks/use-debounced-state"

type SearchResult = {
  tools: Tool[]
  alternatives: Alternative[]
  categories: Category[]
  licenses: License[]
}

export const CommandMenu = () => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useDebouncedState("", 250)
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(open => {
          if (!open) {
            return true
          }

          // Clear search results
          clearSearch()
          return false
        })
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.length > 1) {
        setIsSearching(true)
        const results = await searchItems({ query: searchQuery })
        results && setSearchResults(results[0])
        setIsSearching(false)
      } else {
        setSearchResults(null)
      }
    }

    performSearch()
  }, [searchQuery])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)

    // Clear search results
    !newOpen && clearSearch()
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
  }

  const handleSendSocialPost = async () => {
    await testSocialPosts({ slug: "dub" })
    toast.success("Social post sent")
  }

  const handleSelect = (url: string) => {
    handleOpenChange(false)
    router.push(url)
  }

  const clearSearch = () => {
    setTimeout(() => {
      setSearchResults(null)
      setSearchQuery("")
    }, 250)
  }

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput placeholder="Type to search..." onValueChange={handleSearch} />

      {isSearching && (
        <div className="absolute top-4 left-3 bg-background text-muted-foreground">
          <LoaderIcon className="size-4 animate-spin" />
        </div>
      )}

      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Create">
          <CommandItem onSelect={() => handleSelect("/admin/tools/new")}>New Tool</CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/alternatives/new")}>
            New Alternative
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/categories/new")}>
            New Category
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/licenses/new")}>
            New License
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Quick Commands">
          <CommandItem onSelect={handleSendSocialPost}>Send Social Post</CommandItem>
        </CommandGroup>

        {!!searchResults?.tools.length && (
          <CommandGroup heading="Tools">
            {searchResults.tools.map(tool => (
              <CommandItem
                key={tool.id}
                value={`tool:${tool.name}`}
                onSelect={() => handleSelect(`/admin/tools/${tool.slug}`)}
              >
                {tool.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!!searchResults?.alternatives.length && (
          <CommandGroup heading="Alternatives">
            {searchResults.alternatives.map(alternative => (
              <CommandItem
                key={alternative.id}
                value={`alternative:${alternative.name}`}
                onSelect={() => handleSelect(`/admin/alternatives/${alternative.slug}`)}
              >
                {alternative.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!!searchResults?.categories.length && (
          <CommandGroup heading="Categories">
            {searchResults.categories.map(category => (
              <CommandItem
                key={category.id}
                onSelect={() => handleSelect(`/admin/categories/${category.slug}`)}
              >
                {category.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!!searchResults?.licenses.length && (
          <CommandGroup heading="Licenses">
            {searchResults.licenses.map(license => (
              <CommandItem
                key={license.id}
                onSelect={() => handleSelect(`/admin/licenses/${license.slug}`)}
              >
                {license.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}